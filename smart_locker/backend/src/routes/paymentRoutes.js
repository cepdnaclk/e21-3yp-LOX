const express = require('express');
const { requireAuth, allowRoles } = require('../middleware/authMiddleware');
const { Roles } = require('../constants/enums');
const { createCheckoutSessionHandler, stripeWebhookHandler, verifySessionHandler } = require('../controllers/paymentController');

const router = express.Router();

// Webhook must be raw body, so we skip auth here
// (app.js already handles express.raw for this route)
router.post('/webhook', stripeWebhookHandler);

router.use(requireAuth);
router.post('/checkout-session', allowRoles([Roles.USER, Roles.SUB_ADMIN, Roles.SUPER_ADMIN]), createCheckoutSessionHandler);
router.get('/verify-session', verifySessionHandler);

module.exports = router;