const express = require('express');
const router = express.Router();
const productionOrderController = require('../controllers/productionOrder.controller');
const { protect, authorize } = require('../middlewares/auth');

// All routes require authentication
router.use(protect);

// @route   GET /api/production-orders
// @desc    Get all production orders
// @access  Private
router.get('/', productionOrderController.getProductionOrders);

// @route   GET /api/production-orders/:id
// @desc    Get single production order with lines
// @access  Private
router.get('/:id', productionOrderController.getProductionOrder);

// @route   POST /api/production-orders
// @desc    Create production order
// @access  Private (Chef, Manager, Admin)
router.post('/', authorize('CHEF', 'MANAGER', 'ADMIN'), productionOrderController.createProductionOrder);

// @route   PUT /api/production-orders/:id/status
// @desc    Update production order status
// @access  Private (Chef, Manager, Admin)
router.put('/:id/status', authorize('CHEF', 'MANAGER', 'ADMIN'), productionOrderController.updateProductionOrderStatus);

// @route   POST /api/production-orders/:id/consumption
// @desc    Record production consumption
// @access  Private (Chef, Manager, Admin)
router.post('/:id/consumption', authorize('CHEF', 'MANAGER', 'ADMIN'), productionOrderController.recordConsumption);

// @route   POST /api/production-orders/:id/output
// @desc    Record production output
// @access  Private (Chef, Manager, Admin)
router.post('/:id/output', authorize('CHEF', 'MANAGER', 'ADMIN'), productionOrderController.recordOutput);

module.exports = router;
