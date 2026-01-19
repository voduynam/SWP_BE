const express = require('express');
const router = express.Router();
const returnRequestController = require('../controllers/returnRequest.controller');
const { protect, authorize } = require('../middlewares/auth');

// All routes require authentication
router.use(protect);

// @route   GET /api/return-requests
// @desc    Get all return requests
// @access  Private
router.get('/', returnRequestController.getReturnRequests);

// @route   GET /api/return-requests/:id
// @desc    Get single return request with lines
// @access  Private
router.get('/:id', returnRequestController.getReturnRequest);

// @route   POST /api/return-requests
// @desc    Create return request
// @access  Private (Store Staff, Manager, Admin)
router.post('/', authorize('STORE_STAFF', 'MANAGER', 'ADMIN'), returnRequestController.createReturnRequest);

// @route   PUT /api/return-requests/:id/status
// @desc    Update return request status
// @access  Private (Manager, Admin)
router.put('/:id/status', authorize('MANAGER', 'ADMIN'), returnRequestController.updateReturnStatus);

// @route   PUT /api/return-requests/:id/process
// @desc    Process return and update inventory
// @access  Private (Manager, Admin)
router.put('/:id/process', authorize('MANAGER', 'ADMIN'), returnRequestController.processReturn);

module.exports = router;
