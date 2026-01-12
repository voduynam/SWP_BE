const express = require('express');
const router = express.Router();
const shipmentController = require('../controllers/shipment.controller');
const { protect, authorize } = require('../middlewares/auth');

// All routes require authentication
router.use(protect);

// @route   GET /api/shipments
// @desc    Get all shipments
// @access  Private
router.get('/', shipmentController.getShipments);

// @route   GET /api/shipments/:id
// @desc    Get single shipment with lines
// @access  Private
router.get('/:id', shipmentController.getShipment);

// @route   POST /api/shipments
// @desc    Create shipment from order
// @access  Private (Kitchen Staff, Manager, Admin)
router.post('/', authorize('CHEF', 'MANAGER', 'ADMIN'), shipmentController.createShipment);

// @route   PUT /api/shipments/:id/status
// @desc    Update shipment status
// @access  Private
router.put('/:id/status', shipmentController.updateShipmentStatus);

module.exports = router;
