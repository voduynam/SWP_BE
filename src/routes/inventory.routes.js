const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');
const { protect, authorize } = require('../middlewares/auth');

// All routes require authentication
router.use(protect);

// @route   GET /api/inventory/balances
// @desc    Get inventory balances
// @access  Private
router.get('/balances', inventoryController.getInventoryBalances);

// @route   GET /api/inventory/transactions
// @desc    Get inventory transactions
// @access  Private
router.get('/transactions', inventoryController.getInventoryTransactions);

// @route   GET /api/inventory/summary
// @desc    Get inventory summary by location
// @access  Private
router.get('/summary', inventoryController.getInventorySummary);

// @route   POST /api/inventory/adjust
// @desc    Adjust inventory
// @access  Private (Manager, Admin)
router.post('/adjust', authorize('MANAGER', 'ADMIN'), inventoryController.adjustInventory);

module.exports = router;
