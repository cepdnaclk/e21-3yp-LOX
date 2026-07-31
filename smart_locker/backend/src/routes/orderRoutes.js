const express = require('express');
const { requireAuth, allowRoles } = require('../middleware/authMiddleware');
const { Roles } = require('../constants/enums');
const { 
  listOrdersHandler, 
  updateOrderStatusHandler,
  updatePaymentStatusHandler,
  addOrderMessageHandler,
  deleteOrderHandler 
} = require('../controllers/orderController');

const router = express.Router();

router.use(requireAuth);
router.get('/', listOrdersHandler);

// Super admin only routes
router.patch('/:orderId/order-status', allowRoles([Roles.SUPER_ADMIN]), updateOrderStatusHandler);
router.patch('/:orderId/payment-status', allowRoles([Roles.SUPER_ADMIN]), updatePaymentStatusHandler);
router.post('/:orderId/messages', allowRoles([Roles.SUPER_ADMIN]), addOrderMessageHandler);
router.delete('/:orderId', allowRoles([Roles.SUPER_ADMIN]), deleteOrderHandler);

module.exports = router;