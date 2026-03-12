const express = require('express');
const router = express.Router();
const itemController = require('../controllers/item.controller');
const { protect, authorize } = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Items
 *   description: Item and product catalog management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Item:
 *       type: object
 *       required:
 *         - _id
 *         - sku
 *         - name
 *         - item_type
 *         - base_uom_id
 *       properties:
 *         _id:
 *           type: string
 *           description: Item unique identifier
 *           example: "item_1710241234567"
 *         sku:
 *           type: string
 *           description: Stock Keeping Unit - unique product code
 *           example: "PRD-001"
 *         name:
 *           type: string
 *           description: Product name
 *           example: "Sản phẩm A"
 *         item_type:
 *           type: string
 *           enum: [RAW, FINISHED]
 *           description: Type of item (RAW material or FINISHED product)
 *           example: "FINISHED"
 *         base_uom_id:
 *           type: string
 *           description: Base Unit of Measure ID
 *           example: "uom_kg"
 *         category_id:
 *           type: string
 *           description: Category ID (optional)
 *           example: "cat_001"
 *           nullable: true
 *         tracking_type:
 *           type: string
 *           enum: [NONE, LOT, LOT_EXPIRY, SERIAL]
 *           description: Inventory tracking type
 *           default: NONE
 *           example: "LOT_EXPIRY"
 *         shelf_life_days:
 *           type: number
 *           description: Shelf life in days (0 = no expiry)
 *           default: 0
 *           example: 365
 *         cost_price:
 *           type: number
 *           description: Cost price (purchase price)
 *           default: 0
 *           example: 50000
 *         base_sell_price:
 *           type: number
 *           description: Base selling price
 *           default: 0
 *           example: 75000
 *         status:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *           description: Item status
 *           default: ACTIVE
 *           example: "ACTIVE"
 *       example:
 *         _id: "item_1710241234567"
 *         sku: "PRD-001"
 *         name: "Sản phẩm A"
 *         item_type: "FINISHED"
 *         base_uom_id: "uom_kg"
 *         category_id: "cat_001"
 *         tracking_type: "LOT_EXPIRY"
 *         shelf_life_days: 365
 *         cost_price: 50000
 *         base_sell_price: 75000
 *         status: "ACTIVE"
 */

// All routes require authentication
router.use(protect);

/**
 * @swagger
 * /api/items:
 *   get:
 *     summary: Get all items
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of items
 */
router.get('/', itemController.getItems);

/**
 * @swagger
 * /api/items/{id}:
 *   get:
 *     summary: Get single item
 *     tags: [Items]
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
 *         description: Item details
 */
router.get('/:id', itemController.getItem);

/**
 * @swagger
 * /api/items:
 *   post:
 *     summary: Create item
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Item'
 *     responses:
 *       201:
 *         description: Item created
 */
router.post('/', authorize('MANAGER', 'ADMIN'), itemController.createItem);

/**
 * @swagger
 * /api/items/{id}:
 *   put:
 *     summary: Update item
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Item'
 *     responses:
 *       200:
 *         description: Item updated
 */
router.put('/:id', authorize('MANAGER', 'ADMIN'), itemController.updateItem);

/**
 * @swagger
 * /api/items/{id}:
 *   delete:
 *     summary: Delete item (soft delete)
 *     tags: [Items]
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
 *         description: Item deleted
 */
router.delete('/:id', authorize('ADMIN'), itemController.deleteItem);

module.exports = router;
