const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');
const { protect, authorize } = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: 7. Inventory Management
 *   description: Stock management and tracking
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     InventoryBalance:
 *       type: object
 *       properties:
 *         location_id:
 *           type: string
 *         item_id:
 *           type: string
 *         lot_id:
 *           type: string
 *           nullable: true
 *         qty_on_hand:
 *           type: number
 *     InventoryTransaction:
 *       type: object
 *       properties:
 *         txn_time:
 *           type: string
 *           format: date-time
 *         location_id:
 *           type: string
 *         item_id:
 *           type: string
 *         qty:
 *           type: number
 *         txn_type:
 *           type: string
 *           enum: [RECEIPT, ISSUE, ADJUSTMENT, TRANSFER_IN, TRANSFER_OUT, CONSUMPTION, PRODUCTION]
 */

// All routes require authentication
router.use(protect);

/**
 * @swagger
 * /api/inventory/balances:
 *   get:
 *     summary: Get inventory balances
 *     tags: [7. Inventory Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: location_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: item_id
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of inventory balances
 */
router.get('/balances', inventoryController.getInventoryBalances);

/**
 * @swagger
 * /api/inventory/transactions:
 *   get:
 *     summary: Get inventory transactions
 *     tags: [7. Inventory Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of inventory transactions
 */
router.get('/transactions', inventoryController.getInventoryTransactions);

/**
 * @swagger
 * /api/inventory/summary:
 *   get:
 *     summary: Get inventory summary by location
 *     tags: [7. Inventory Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory summary
 */
router.get('/summary', inventoryController.getInventorySummary);

/**
 * @swagger
 * /api/inventory/adjust:
 *   post:
 *     summary: Adjust inventory
 *     tags: [7. Inventory Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               location_id:
 *                 type: string
 *               item_id:
 *                 type: string
 *               lot_id:
 *                 type: string
 *               adj_qty:
 *                 type: number
 *               reason_code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Inventory adjusted
 */
router.post('/adjust', authorize('MANAGER', 'ADMIN'), inventoryController.adjustInventory);

module.exports = router;
