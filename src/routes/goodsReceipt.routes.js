const express = require('express');
const router = express.Router();
const goodsReceiptController = require('../controllers/goodsReceipt.controller');
const { protect, authorize } = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: 6. Receipt Flow
 *   description: Receiving inventory from Central Kitchen or Suppliers
 */

// All routes require authentication
router.use(protect);

/**
 * @swagger
 * /api/goods-receipts:
 *   get:
 *     summary: Get all goods receipts
 *     tags: [6. Receipt Flow]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of goods receipts
 */
router.get('/', goodsReceiptController.getGoodsReceipts);

/**
 * @swagger
 * /api/goods-receipts/{id}:
 *   get:
 *     summary: Get single goods receipt with lines
 *     tags: [6. Receipt Flow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Goods receipt details
 */
router.get('/:id', goodsReceiptController.getGoodsReceipt);

/**
 * @swagger
 * /api/goods-receipts:
 *   post:
 *     summary: Create goods receipt from shipment
 *     tags: [6. Receipt Flow]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               shipment_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Goods receipt created (DRAFT)
 */
router.post('/', authorize('STORE_STAFF', 'MANAGER', 'ADMIN'), goodsReceiptController.createGoodsReceipt);

/**
 * @swagger
 * /api/goods-receipts/{id}/confirm:
 *   put:
 *     summary: Confirm goods receipt (update inventory)
 *     tags: [6. Receipt Flow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Goods receipt confirmed and inventory updated
 */
router.put('/:id/confirm', authorize('STORE_STAFF', 'MANAGER', 'ADMIN'), goodsReceiptController.confirmGoodsReceipt);

module.exports = router;
