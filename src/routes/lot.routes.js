const express = require('express');
const router = express.Router();
const lotController = require('../controllers/lot.controller');
const { protect, authorize } = require('../middlewares/auth');

// All routes require authentication
router.use(protect);

// @route   GET /api/lots
// @desc    Get all lots
// @access  Private
router.get('/', lotController.getLots);

// @route   GET /api/lots/:id
// @desc    Get single lot
// @access  Private
router.get('/:id', lotController.getLot);

// @route   POST /api/lots
// @desc    Create lot
// @access  Private (Kitchen Staff, Manager, Admin)
router.post('/', authorize('CHEF', 'MANAGER', 'ADMIN'), lotController.createLot);

// @route   PUT /api/lots/:id
// @desc    Update lot
// @access  Private (Kitchen Staff, Manager, Admin)
router.put('/:id', authorize('CHEF', 'MANAGER', 'ADMIN'), lotController.updateLot);

module.exports = router;
