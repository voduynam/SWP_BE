const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { protect } = require('../middlewares/auth');

// All routes require authentication
router.use(protect);

// @route   GET /api/dashboard/overview
// @desc    Get dashboard overview
// @access  Private
router.get('/overview', dashboardController.getDashboardOverview);

// @route   GET /api/dashboard/orders
// @desc    Get order statistics
// @access  Private
router.get('/orders', dashboardController.getOrderStatistics);

// @route   GET /api/dashboard/production
// @desc    Get production statistics
// @access  Private
router.get('/production', dashboardController.getProductionStatistics);

// @route   GET /api/dashboard/inventory
// @desc    Get inventory statistics
// @access  Private
router.get('/inventory', dashboardController.getInventoryStatistics);

// @route   GET /api/dashboard/shipments
// @desc    Get shipment statistics
// @access  Private
router.get('/shipments', dashboardController.getShipmentStatistics);

module.exports = router;
