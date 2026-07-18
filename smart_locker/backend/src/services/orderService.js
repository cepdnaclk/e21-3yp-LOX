const Order = require('../models/Order');

const ORDER_STATUSES = ['PENDING', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'];

function toOrderDTO(order) {
  return {
    id: order._id,
    userId: order.userId,
    productId: order.productId,
    productName: order.productName,
    productCategory: order.productCategory,
    selectedColor: order.selectedColor || '',
    quantity: order.quantity || 1,
    unitPrice: order.unitPrice || 0,
    deliveryFee: order.deliveryFee || 0,
    deliveryDays: order.deliveryDays || 0,
    currency: order.currency || 'usd',
    amount: order.amount || 0,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    messages: order.messages || [],
    stripeSessionId: order.stripeSessionId || '',
    stripePaymentIntentId: order.stripePaymentIntentId || '',
    stripePaymentStatus: order.stripePaymentStatus || '',
    customerEmail: order.customerEmail || '',
    checkoutUrl: order.checkoutUrl || '',
    paidAt: order.paidAt,
    failedAt: order.failedAt,
    notes: order.notes || '',
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };
}

async function createOrder(payload) {
  const order = await Order.create(payload);
  return toOrderDTO(order);
}

async function findOrderByStripeSessionId(stripeSessionId) {
  const order = await Order.findOne({ stripeSessionId });
  return order;
}

async function listOrdersForUser(user) {
  const query = user.role === 'SUPER_ADMIN' ? {} : { userId: user._id };
  const orders = await Order.find(query).sort({ createdAt: -1 });
  return orders.map(toOrderDTO);
}

async function updateOrderByStripeSessionId(stripeSessionId, updates) {
  const order = await Order.findOneAndUpdate(
    { stripeSessionId },
    { $set: updates },
    { new: true }
  );

  return order ? toOrderDTO(order) : null;
}

async function updateOrderById(orderId, updates) {
  const order = await Order.findByIdAndUpdate(orderId, { $set: updates }, { new: true });
  return order ? toOrderDTO(order) : null;
}

async function updateOrderStatus(orderId, orderStatus) {
  if (!ORDER_STATUSES.includes(orderStatus.toUpperCase())) {
    const error = new Error('Invalid order status');
    error.statusCode = 400;
    throw error;
  }

  const updates = { orderStatus: orderStatus.toUpperCase() };

  const order = await Order.findByIdAndUpdate(orderId, { $set: updates }, { new: true });
  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }

  return toOrderDTO(order);
}

async function updatePaymentStatus(orderId, paymentStatus) {
  if (!PAYMENT_STATUSES.includes(paymentStatus.toUpperCase())) {
    const error = new Error('Invalid payment status');
    error.statusCode = 400;
    throw error;
  }

  const updates = { paymentStatus: paymentStatus.toUpperCase() };

  if (updates.paymentStatus === 'PAID') {
    updates.paidAt = new Date();
    updates.failedAt = null;
  } else if (updates.paymentStatus === 'FAILED') {
    updates.failedAt = new Date();
    updates.paidAt = null;
  } else if (updates.paymentStatus === 'PENDING') {
    updates.paidAt = null;
    updates.failedAt = null;
  }

  const order = await Order.findByIdAndUpdate(orderId, { $set: updates }, { new: true });
  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }

  return toOrderDTO(order);
}

async function addOrderMessage(orderId, message, senderRole = 'SUPER_ADMIN') {
  const order = await Order.findByIdAndUpdate(
    orderId,
    { $push: { messages: { message, senderRole, date: new Date() } } },
    { new: true }
  );
  
  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }
  
  return toOrderDTO(order);
}

async function deleteOrder(orderId) {
  const order = await Order.findByIdAndDelete(orderId);
  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }
  return true;
}

module.exports = {
  toOrderDTO,
  createOrder,
  findOrderByStripeSessionId,
  listOrdersForUser,
  updateOrderByStripeSessionId,
  updateOrderById,
  updateOrderStatus,
  updatePaymentStatus,
  addOrderMessage,
  deleteOrder,
  ORDER_STATUSES,
  PAYMENT_STATUSES
};