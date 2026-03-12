const express = require('express');
const router = express.Router();
const goodsReceiptController = require('../controllers/goodsReceipt.controller');
const { protect, authorize } = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Goods Receipts
 *   description: Receiving inventory from Central Kitchen or Suppliers
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     GoodsReceipt:
 *       type: object
 *       required:
 *         - shipment_id
 *         - received_date
 *         - received_by
 *       properties:
 *         _id:
 *           type: string
 *           description: Goods receipt unique identifier
 *           example: "gr_1710241234567"
 *         receipt_no:
 *           type: string
 *           description: Receipt number (auto-generated GR-XXXX)
 *           example: "GR-0001"
 *         shipment_id:
 *           type: string
 *           description: Shipment ID being received
 *           example: "ship_1710241234567"
 *         received_date:
 *           type: string
 *           format: date-time
 *           description: Receiving date
 *           example: "2026-03-12T15:30:00Z"
 *         status:
 *           type: string
 *           enum: [DRAFT, RECEIVED, PARTIAL, CANCELLED]
 *           description: Receipt status
 *           example: "RECEIVED"
 *         received_by:
 *           type: string
 *           description: User ID who received the goods
 *           example: "user_456"
 *       example:
 *         _id: "gr_1710241234567"
 *         receipt_no: "GR-0001"
 *         shipment_id: "ship_1710241234567"
 *         received_date: "2026-03-12T15:30:00Z"
 *         status: "RECEIVED"
 *         received_by: "user_456"
 *
 *     GoodsReceiptLine:
 *       type: object
 *       required:
 *         - shipment_line_id
 *         - item_id
 *         - qty_received
 *       properties:
 *         _id:
 *           type: string
 *           description: Receipt line unique identifier
 *           example: "gr_line_1710241234567_0"
 *         receipt_id:
 *           type: string
 *           description: Parent receipt ID
 *           example: "gr_1710241234567"
 *         shipment_line_id:
 *           type: string
 *           description: Original shipment line ID
 *           example: "ship_line_1710241234567_0"
 *         item_id:
 *           type: string
 *           description: Item/Product ID
 *           example: "item_001"
 *         qty_received:
 *           type: number
 *           description: Quantity received successfully
 *           example: 10
 *         qty_rejected:
 *           type: number
 *           description: Quantity rejected/damaged
 *           default: 0
 *           example: 0
 *       example:
 *         _id: "gr_line_1710241234567_0"
 *         receipt_id: "gr_1710241234567"
 *         shipment_line_id: "ship_line_1710241234567_0"
 *         item_id: "item_001"
 *         qty_received: 10
 *         qty_rejected: 0
 */

// All routes require authentication
router.use(protect);

/**
 * @swagger
 * /api/goods-receipts:
 *   get:
 *     summary: Get all goods receipts
 *     tags: [Goods Receipts]
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
 *     tags: [Goods Receipts]
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
 *     tags: [Goods Receipts]
 *     description: |
 *       Create a new goods receipt based on a shipment.
 *       This initializes the receipt in DRAFT status.
 *       Call /confirm endpoint after entering quantities to finalize.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shipment_id
 *             properties:
 *               shipment_id:
 *                 type: string
 *                 description: Shipment ID to receive
 *                 example: "ship_1710241234567"
 *           example:
 *             shipment_id: "ship_1710241234567"
 *     responses:
 *       201:
 *         description: Goods receipt created in DRAFT status
 *       400:
 *         description: "Error: Shipment not found / Invalid status"
 */
router.post('/', authorize('STORE_STAFF', 'MANAGER', 'ADMIN'), goodsReceiptController.createGoodsReceipt);

/**
 * @swagger
 * /api/goods-receipts/{id}/confirm:
 *   put:
 *     summary: Confirm goods receipt (update inventory)
 *     tags: [Goods Receipts]
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
