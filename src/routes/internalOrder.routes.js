const express = require('express');
const router = express.Router();
const internalOrderController = require('../controllers/internalOrder.controller');
const { protect, authorize } = require('../middlewares/auth');

// All routes require authentication
router.use(protect);

// @route   GET /api/internal-orders
// @desc    Get all internal orders
// @access  Private
router.get('/', internalOrderController.getInternalOrders);

// @route   GET /api/internal-orders/:id
// @desc    Get single internal order with lines
// @access  Private
router.get('/:id', internalOrderController.getInternalOrder);

// @route   POST /api/internal-orders
// @desc    Create internal order
// @access  Private (Store Staff, Manager, Admin)
router.post('/', authorize('STORE_STAFF', 'MANAGER', 'ADMIN'), internalOrderController.createInternalOrder);

// @route   PUT /api/internal-orders/:id/status
// @desc    Update internal order status
// @access  Private
router.put('/:id/status', internalOrderController.updateOrderStatus);

// @route   POST /api/internal-orders/:id/lines
// @desc    Add line to internal order
// @access  Private
router.post('/:id/lines', internalOrderController.addOrderLine);

module.exports = router;
