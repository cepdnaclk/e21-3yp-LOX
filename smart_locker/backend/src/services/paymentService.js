const stripeLib = require('stripe');
const { env } = require('../config/env');
const Product = require('../models/Product');
const Locker = require('../models/Locker');
const Station = require('../models/Station');
const { Roles } = require('../constants/enums');
const { createOrder, findOrderByStripeSessionId, updateOrderById, updateOrderByStripeSessionId } = require('./orderService');
const { getReservationPhase, markOverdueReleased } = require('./overdueService');
const { sendPushNotification } = require('./notificationService');

function getStripeClient() {
  if (!env.stripeSecretKey) {
    const error = new Error('Stripe secret key is not configured');
    error.statusCode = 503;
    throw error;
  }

  return stripeLib(env.stripeSecretKey);
}

function buildOrigin(req) {
  // Mobile apps send a deep-link scheme as the origin (e.g. "loxapp://payment").
  // Pass it through verbatim – no host/port rewriting needed.
  if (req && req.body && req.body.origin) {
    const origin = req.body.origin;
    if (origin.startsWith('loxapp://') || origin.startsWith('smartlocker://')) {
      return origin;
    }
    return origin;
  }
  if (req && req.headers.origin) {
    return req.headers.origin;
  }
  if (req && req.get) {
    const host = req.get('host'); // e.g. "192.168.8.186:3001" or "localhost:3001"
    if (host) {
      const protocol = req.protocol || 'http';
      if (host.includes(':')) {
        const parts = host.split(':');
        if (parts[1] === '3001') {
          return `${protocol}://${parts[0]}:3000`;
        }
        return `${protocol}://${parts[0]}:${parts[1]}`;
      }
      return `${protocol}://${host}`;
    }
  }
  if (env.frontendUrl) {
    return env.frontendUrl;
  }
  return 'http://localhost:3000';
}

function toMinorUnit(amount) {
  return Math.round(Number(amount || 0) * 100);
}

function normalizeQuantity(quantity) {
  const value = Number.parseInt(quantity, 10);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

async function createCheckoutSession(user, payload, req) {
  if (![Roles.USER, Roles.SUB_ADMIN, Roles.SUPER_ADMIN].includes(user.role)) {
    const error = new Error('This account cannot place checkout orders');
    error.statusCode = 403;
    throw error;
  }

  const product = await Product.findById(payload.productId);
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  const quantity = normalizeQuantity(payload.quantity);
  const selectedColor = String(payload.selectedColor || product.colors?.[0]?.name || '').trim();
  const currency = String(payload.currency || env.stripeCurrency || 'usd').toLowerCase();
  const deliveryFee = Number(product.deliveryFee || 0);
  const subtotal = Number(product.price || 0) * quantity;
  const totalAmount = subtotal + deliveryFee;
  const isMobile = Boolean(payload.isMobile);

  let order = null;
  if (isMobile) {
    order = await createOrder({
      userId: user._id,
      productId: product._id,
      productName: product.name,
      productCategory: product.category,
      selectedColor,
      quantity,
      unitPrice: Number(product.price || 0),
      deliveryFee,
      deliveryDays: Number(product.deliveryDays || 0),
      currency,
      amount: totalAmount,
      orderStatus: 'PENDING',
      paymentStatus: 'PENDING'
    });
  }

  const stripe = getStripeClient();
  const origin = buildOrigin(req);

  let successUrl, cancelUrl;
  if (isMobile && req && req.get) {
    const host = req.get('host');
    const protocol = req.protocol || 'http';
    const backendUrl = `${protocol}://${host}/api/payments`;
    successUrl = `${backendUrl}/mobile/success?session_id={CHECKOUT_SESSION_ID}&type=store`;
    cancelUrl = `${backendUrl}/mobile/cancel?session_id={CHECKOUT_SESSION_ID}&type=store`;
  } else {
    successUrl = `${origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`;
    cancelUrl = `${origin}/dashboard?cancel=true`;
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: user.email,
    client_reference_id: String(user._id),
    success_url: successUrl,
    cancel_url: cancelUrl,
    line_items: [
      {
        quantity,
        price_data: {
          currency,
          unit_amount: toMinorUnit(totalAmount),
          product_data: {
            name: product.name,
            description: `${product.category} - ${product.deliveryLabel || 'Delivery included'}`,
            metadata: {
              productId: String(product._id),
              ...(isMobile ? { orderId: String(order.id) } : {})
            }
          }
        }
      }
    ],
    metadata: {
      productId: String(product._id),
      userId: String(user._id),
      selectedColor,
      quantity: String(quantity),
      ...(isMobile ? { orderId: String(order.id) } : {})
    }
  });

  if (isMobile && order) {
    order = await updateOrderById(order.id, {
      stripeSessionId: checkoutSession.id,
      checkoutUrl: checkoutSession.url || '',
      notes: 'Checkout session created'
    });
  }

  return {
    order,
    checkoutUrl: checkoutSession.url,
    sessionId: checkoutSession.id
  };
}

/**
 * Create a Stripe checkout session specifically for an overdue locker fee.
 * @param {object} user - authenticated user
 * @param {string} lockerId - the locker that is overdue
 * @param {object} req - express request (for origin)
 */
async function createOverdueCheckoutSession(user, lockerId, req) {
  if (user.role !== Roles.USER) {
    const error = new Error('Only regular users can pay overdue locker fees');
    error.statusCode = 403;
    throw error;
  }

  const locker = await Locker.findById(lockerId);
  if (!locker) {
    const error = new Error('Locker not found');
    error.statusCode = 404;
    throw error;
  }

  if (String(locker.currentUserId || '') !== String(user._id)) {
    const error = new Error('You are not the current user of this locker');
    error.statusCode = 403;
    throw error;
  }

  const station = await Station.findById(locker.stationId);
  const { phase, chargeAmount, overdueMs } = getReservationPhase(locker, station || {});

  const { ReservationPhase } = require('../constants/enums');
  if (phase !== ReservationPhase.OVERDUE) {
    const error = new Error('This locker is not currently overdue');
    error.statusCode = 400;
    throw error;
  }

  const currency = (env.stripeCurrency || 'usd').toLowerCase();
  const overdueMinutes = Math.ceil(overdueMs / 60000);
  const stationName = station?.name || 'Locker Station';

  const order = await createOrder({
    userId: user._id,
    productId: locker._id,          // reuse productId field to reference the locker
    productName: `Overdue Fee – Locker ${locker.code}`,
    productCategory: 'OVERDUE_FEE',
    selectedColor: '',
    quantity: 1,
    unitPrice: chargeAmount,
    deliveryFee: 0,
    deliveryDays: 0,
    currency,
    amount: chargeAmount,
    status: 'PENDING',
    notes: `Overdue by ${overdueMinutes} minutes at ${stationName}`
  });

  const isMobile = req && req.body && Boolean(req.body.isMobile);
  const stripe = getStripeClient();
  const origin = buildOrigin(req);

  let successUrl, cancelUrl;
  if (isMobile && req && req.get) {
    const host = req.get('host');
    const protocol = req.protocol || 'http';
    const backendUrl = `${protocol}://${host}/api/payments`;
    successUrl = `${backendUrl}/mobile/success?session_id={CHECKOUT_SESSION_ID}&type=overdue&lockerId=${lockerId}`;
    cancelUrl = `${backendUrl}/mobile/cancel?session_id={CHECKOUT_SESSION_ID}&type=overdue&lockerId=${lockerId}`;
  } else {
    const host = req && req.get ? req.get('host') : 'localhost:3001';
    const protocol = (req && req.protocol) || 'http';
    const backendUrl = `${protocol}://${host}/api/payments`;
    successUrl = `${backendUrl}/web/success?session_id={CHECKOUT_SESSION_ID}&type=overdue&lockerId=${lockerId}&origin=${encodeURIComponent(origin)}`;
    cancelUrl = `${origin}/?payment=overdue_cancel&session_id={CHECKOUT_SESSION_ID}&lockerId=${lockerId}`;
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: user.email,
    client_reference_id: String(user._id),
    success_url: successUrl,
    cancel_url: cancelUrl,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: toMinorUnit(chargeAmount),
          product_data: {
            name: `Overdue Fee – Locker ${locker.code}`,
            description: `Overdue by ${overdueMinutes} min at ${stationName}. Rate: $${station?.overdueRatePerHour ?? 1}/hr`
          }
        }
      }
    ],
    metadata: {
      orderId: String(order.id),
      userId: String(user._id),
      lockerId: String(locker._id),
      lockerCode: locker.code,
      type: 'OVERDUE_FEE'
    }
  });

  const savedOrder = await updateOrderById(order.id, {
    stripeSessionId: checkoutSession.id,
    checkoutUrl: checkoutSession.url || '',
    notes: `Overdue checkout session created. Overdue: ${overdueMinutes} min`
  });

  return {
    order: savedOrder,
    checkoutUrl: checkoutSession.url,
    sessionId: checkoutSession.id,
    chargeAmount,
    overdueMinutes
  };
}

async function fulfillCheckoutSession(session) {
  console.log('[fulfillCheckoutSession] Starting fulfillment for session:', session.id);
  let order = await findOrderByStripeSessionId(session.id);

  if (order) {
    // If already paid, don't repeat the fulfillment
    if (order.paymentStatus === 'PAID') {
      console.log('[fulfillCheckoutSession] Order is already PAID. Skipping duplicate fulfillment.');
      return order;
    }

    order = await updateOrderByStripeSessionId(session.id, {
      paymentStatus: 'PAID',
      stripePaymentStatus: session.payment_status || 'paid',
      stripePaymentIntentId: String(session.payment_intent || ''),
      customerEmail: session.customer_details?.email || session.customer_email || order.customerEmail || '',
      paidAt: new Date(),
      notes: 'Payment confirmed by checkout completion'
    });
    console.log('[fulfillCheckoutSession] Existing order status updated to PAID for order:', order.id || order._id);
  } else {
    // Create new order (e.g. from web dashboard)
    const meta = session.metadata || {};
    const productId = meta.productId;
    const userId = meta.userId;
    const quantity = parseInt(meta.quantity, 10) || 1;
    const selectedColor = meta.selectedColor || '';

    if (!productId || !userId) {
      console.warn('[fulfillCheckoutSession] Webhook missing metadata in session:', session.id);
      return null;
    }

    const product = await Product.findById(productId);
    if (!product) {
      console.error('[fulfillCheckoutSession] Webhook product not found:', productId);
      return null;
    }

    const currency = String(session.currency || 'usd').toLowerCase();
    const deliveryFee = Number(product.deliveryFee || 0);
    const subtotal = Number(product.price || 0) * quantity;
    const totalAmount = subtotal + deliveryFee;

    order = await createOrder({
      userId: userId,
      productId: product._id,
      productName: product.name,
      productCategory: product.category,
      selectedColor,
      quantity,
      unitPrice: Number(product.price || 0),
      deliveryFee,
      deliveryDays: Number(product.deliveryDays || 0),
      currency,
      amount: totalAmount,
      orderStatus: 'PENDING',
      paymentStatus: 'PAID',
      stripeSessionId: session.id,
      stripePaymentIntentId: String(session.payment_intent || ''),
      stripePaymentStatus: session.payment_status || 'paid',
      customerEmail: session.customer_details?.email || session.customer_email || '',
      paidAt: new Date(),
      notes: 'Order created and paid via Stripe checkout completion'
    });
    console.log('[fulfillCheckoutSession] Created new PAID order for web dashboard:', order.id || order._id);
  }

  // --- Handle overdue fee payment ---
  const lockerId = session.metadata?.lockerId;
  const isOverdueFee = session.metadata?.type === 'OVERDUE_FEE';
  if (isOverdueFee && lockerId) {
    try {
      console.log('[fulfillCheckoutSession] Processing overdue fee release for lockerId:', lockerId);
      const locker = await markOverdueReleased(lockerId, order.id || order._id);
      console.log('[fulfillCheckoutSession] Locker overdueReleasedAt marked as:', locker.overdueReleasedAt);
      sendPushNotification(
        locker.currentUserId,
        'Overdue Fee Paid — Grace Period Started',
        `Payment confirmed! You now have a grace period to unlock locker ${locker.code} and retrieve your items.`,
        {
          type: 'OVERDUE_RELEASED',
          lockerId: String(locker._id),
          lockerCode: locker.code
        }
      );
    } catch (err) {
      console.error('[Session Fulfillment] Failed to mark locker overdue-released:', err.message);
    }
  }

  return order;
}

async function handleStripeWebhookEvent(event) {
  const session = event.data.object;

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    return fulfillCheckoutSession(session);
  }

  if (event.type === 'checkout.session.expired') {
    const sessionId = session.id || '';
    if (!sessionId) {
      return null;
    }

    return updateOrderByStripeSessionId(sessionId, {
      paymentStatus: 'FAILED',
      stripePaymentStatus: session.payment_status || 'unpaid',
      failedAt: new Date(),
      notes: 'Payment failed or checkout expired'
    });
  }

  return null;
}

async function verifySession(sessionId) {
  if (!sessionId) throw new Error('Session ID is required');
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (!session) throw new Error('Session not found');

  if (session.payment_status === 'paid' || session.status === 'complete') {
    const order = await fulfillCheckoutSession(session);
    return { order, status: order ? order.paymentStatus : session.payment_status };
  }

  const existingOrder = await findOrderByStripeSessionId(sessionId);
  return { order: existingOrder, status: existingOrder ? existingOrder.paymentStatus : session.payment_status };
}

module.exports = {
  createCheckoutSession,
  createOverdueCheckoutSession,
  fulfillCheckoutSession,
  handleStripeWebhookEvent,
  verifySession
};