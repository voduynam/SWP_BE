const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alert.controller');
const { protect } = require('../middlewares/auth');

// All routes require authentication
router.use(protect);

// @route   GET /api/alerts/expiry
// @desc    Get expiry alerts
// @access  Private
router.get('/expiry', alertController.getExpiryAlerts);

// @route   GET /api/alerts/low-stock
// @desc    Get low stock alerts
// @access  Private
router.get('/low-stock', alertController.getLowStockAlerts);

// @route   GET /api/alerts/summary
// @desc    Get all alerts summary
// @access  Private
router.get('/summary', alertController.getAlertsSummary);

module.exports = router;
