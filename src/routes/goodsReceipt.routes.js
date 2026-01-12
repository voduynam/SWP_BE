const express = require('express');
const router = express.Router();
const goodsReceiptController = require('../controllers/goodsReceipt.controller');
const { protect, authorize } = require('../middlewares/auth');

// All routes require authentication
router.use(protect);

// @route   GET /api/goods-receipts
// @desc    Get all goods receipts
// @access  Private
router.get('/', goodsReceiptController.getGoodsReceipts);

// @route   GET /api/goods-receipts/:id
// @desc    Get single goods receipt with lines
// @access  Private
router.get('/:id', goodsReceiptController.getGoodsReceipt);

// @route   POST /api/goods-receipts
// @desc    Create goods receipt from shipment
// @access  Private (Store Staff, Manager, Admin)
router.post('/', authorize('STORE_STAFF', 'MANAGER', 'ADMIN'), goodsReceiptController.createGoodsReceipt);

// @route   PUT /api/goods-receipts/:id/confirm
// @desc    Confirm goods receipt (update inventory)
// @access  Private (Store Staff, Manager, Admin)
router.put('/:id/confirm', authorize('STORE_STAFF', 'MANAGER', 'ADMIN'), goodsReceiptController.confirmGoodsReceipt);

module.exports = router;
