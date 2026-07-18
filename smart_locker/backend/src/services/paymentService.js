const stripeLib = require('stripe');
const { env } = require('../config/env');
const Product = require('../models/Product');
const { Roles } = require('../constants/enums');
const { createOrder, findOrderByStripeSessionId, updateOrderById, updateOrderByStripeSessionId } = require('./orderService');

function getStripeClient() {
  if (!env.stripeSecretKey) {
    const error = new Error('Stripe secret key is not configured');
    error.statusCode = 503;
    throw error;
  }

  return stripeLib(env.stripeSecretKey);
}

function buildOrigin(req) {
  return req.headers.origin || env.frontendUrl || 'http://localhost:3000';
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

  const stripe = getStripeClient();
  const origin = buildOrigin(req);
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: user.email,
    client_reference_id: String(user._id),
    success_url: `${origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/dashboard?cancel=true`,
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
              productId: String(product._id)
            }
          }
        }
      }
    ],
    metadata: {
      productId: String(product._id),
      userId: String(user._id),
      selectedColor,
      quantity: String(quantity)
    }
  });

  return {
    order: null, // Order will be created by the Stripe webhook upon successful payment
    checkoutUrl: checkoutSession.url,
    sessionId: checkoutSession.id
  };
}

async function handleStripeWebhookEvent(event) {
  const session = event.data.object;

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const order = await findOrderByStripeSessionId(session.id);
    if (order) {
      // In case webhook fires multiple times
      return updateOrderByStripeSessionId(session.id, {
        paymentStatus: 'PAID',
        stripePaymentStatus: session.payment_status || 'paid',
        stripePaymentIntentId: String(session.payment_intent || ''),
        customerEmail: session.customer_details?.email || session.customer_email || order.customerEmail || '',
        paidAt: new Date(),
        notes: 'Payment confirmed by Stripe webhook (duplicate event)'
      });
    }

    const meta = session.metadata || {};
    const productId = meta.productId;
    const userId = meta.userId;
    const quantity = parseInt(meta.quantity, 10) || 1;
    const selectedColor = meta.selectedColor || '';

    if (!productId || !userId) {
      console.error('Webhook missing metadata', session.id);
      return null;
    }

    const product = await Product.findById(productId);
    if (!product) {
      console.error('Webhook product not found', productId);
      return null;
    }

    const currency = String(session.currency || 'usd').toLowerCase();
    const deliveryFee = Number(product.deliveryFee || 0);
    const subtotal = Number(product.price || 0) * quantity;
    const totalAmount = subtotal + deliveryFee;

    const newOrder = await createOrder({
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
      notes: 'Order created and paid via Stripe webhook'
    });

    return newOrder;
  }

  if (event.type === 'checkout.session.expired') {
    // If order was only created on success, there's no order to update on expiration.
    return null;
  }

  return null;
}

async function verifySession(sessionId) {
  if (!sessionId) throw new Error('Session ID is required');
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (!session) throw new Error('Session not found');

  const existingOrder = await findOrderByStripeSessionId(sessionId);
  if (existingOrder) {
    if (existingOrder.paymentStatus !== 'PAID' && session.payment_status === 'paid') {
      const updatedOrder = await updateOrderByStripeSessionId(sessionId, {
        paymentStatus: 'PAID',
        stripePaymentStatus: session.payment_status || 'paid',
        stripePaymentIntentId: String(session.payment_intent || ''),
        customerEmail: session.customer_details?.email || session.customer_email || existingOrder.customerEmail || '',
        paidAt: new Date(),
        notes: 'Payment confirmed by manual verification'
      });
      return { order: updatedOrder, status: 'PAID' };
    }
    return { order: existingOrder, status: existingOrder.paymentStatus };
  }

  if (session.payment_status === 'paid') {
    const meta = session.metadata || {};
    const productId = meta.productId;
    const userId = meta.userId;
    const quantity = parseInt(meta.quantity, 10) || 1;
    const selectedColor = meta.selectedColor || '';

    if (!productId || !userId) throw new Error('Missing metadata in session');

    const product = await Product.findById(productId);
    if (!product) throw new Error('Product not found');

    const currency = String(session.currency || 'usd').toLowerCase();
    const deliveryFee = Number(product.deliveryFee || 0);
    const subtotal = Number(product.price || 0) * quantity;
    const totalAmount = subtotal + deliveryFee;

    const newOrder = await createOrder({
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
      notes: 'Order created and paid via manual verification'
    });

    return { order: newOrder, status: 'PAID' };
  }

  return { order: null, status: session.payment_status };
}

module.exports = {
  createCheckoutSession,
  handleStripeWebhookEvent,
  verifySession
};