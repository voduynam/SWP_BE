const express = require('express');
const router = express.Router();
const itemController = require('../controllers/item.controller');
const { protect, authorize } = require('../middlewares/auth');

// All routes require authentication
router.use(protect);

// @route   GET /api/items
// @desc    Get all items
// @access  Private
router.get('/', itemController.getItems);

// @route   GET /api/items/:id
// @desc    Get single item
// @access  Private
router.get('/:id', itemController.getItem);

// @route   POST /api/items
// @desc    Create item
// @access  Private (Manager, Admin)
router.post('/', authorize('MANAGER', 'ADMIN'), itemController.createItem);

// @route   PUT /api/items/:id
// @desc    Update item
// @access  Private (Manager, Admin)
router.put('/:id', authorize('MANAGER', 'ADMIN'), itemController.updateItem);

// @route   DELETE /api/items/:id
// @desc    Delete item (soft delete)
// @access  Private (Admin)
router.delete('/:id', authorize('ADMIN'), itemController.deleteItem);

module.exports = router;
