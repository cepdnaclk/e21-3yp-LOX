const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../presenters/apiPresenter');
const { listOrdersForUser, updateOrderStatus, updatePaymentStatus, addOrderMessage, deleteOrder } = require('../services/orderService');

const listOrdersHandler = asyncHandler(async (req, res) => {
  const orders = await listOrdersForUser(req.user);
  return success(res, { orders });
});

const updateOrderStatusHandler = asyncHandler(async (req, res) => {
  const order = await updateOrderStatus(req.params.orderId, req.body.orderStatus);
  return success(res, { message: 'Order status updated', order });
});

const updatePaymentStatusHandler = asyncHandler(async (req, res) => {
  const order = await updatePaymentStatus(req.params.orderId, req.body.paymentStatus);
  return success(res, { message: 'Payment status updated', order });
});

const addOrderMessageHandler = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message) {
    const error = new Error('Message is required');
    error.statusCode = 400;
    throw error;
  }
  const order = await addOrderMessage(req.params.orderId, message, req.user.role);
  return success(res, { message: 'Message sent', order });
});

const deleteOrderHandler = asyncHandler(async (req, res) => {
  await deleteOrder(req.params.orderId);
  return success(res, { message: 'Order deleted successfully' });
});

module.exports = {
  listOrdersHandler,
  updateOrderStatusHandler,
  updatePaymentStatusHandler,
  addOrderMessageHandler,
  deleteOrderHandler
};