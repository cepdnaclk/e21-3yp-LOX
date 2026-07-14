const express = require('express');
const { getDashboardDataHandler } = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', requireAuth, getDashboardDataHandler);

module.exports = router;
