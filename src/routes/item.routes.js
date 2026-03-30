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
 *           example: "Bánh Trung Thu Nhân Đậu Xanh"
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
 *           description: Cost price (purchase price for materials)
 *           default: 0
 *           example: 50000
 *         base_sell_price:
 *           type: number
 *           description: Base selling price (for finished products)
 *           default: 0
 *           example: 75000
 *         status:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *           description: Item status
 *           default: ACTIVE
 *           example: "ACTIVE"
 */

// All routes require authentication
router.use(protect);

// ==========================================
// CRUD OPERATIONS
// ==========================================

/**
 * @swagger
 * /api/items:
 *   get:
 *     summary: Get all items (materials and finished products)
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: item_type
 *         schema:
 *           type: string
 *           enum: [RAW, FINISHED]
 *         description: Filter by item type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *         description: Filter by status
 *       - in: query
 *         name: category_id
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or SKU
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of items with pagination
 */
router.get('/', itemController.getItems);

/**
 * @swagger
 * /api/items:
 *   post:
 *     summary: Create new item (material or finished product)
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Item'
 *           examples:
 *             material:
 *               summary: Raw Material Example
 *               value:
 *                 sku: "RM-001"
 *                 name: "Bột mì"
 *                 item_type: "RAW"
 *                 base_uom_id: "uom_kg"
 *                 category_id: "cat_ingredients"
 *                 tracking_type: "NONE"
 *                 shelf_life_days: 365
 *                 cost_price: 15000
 *                 base_sell_price: 0
 *             finished_product:
 *               summary: Finished Product Example
 *               value:
 *                 sku: "FP-001"
 *                 name: "Bánh Trung Thu Nhân Đậu Xanh"
 *                 item_type: "FINISHED"
 *                 base_uom_id: "uom_unit"
 *                 category_id: "cat_mooncakes"
 *                 tracking_type: "LOT_EXPIRY"
 *                 shelf_life_days: 30
 *                 cost_price: 0
 *                 base_sell_price: 50000
 *     responses:
 *       201:
 *         description: Item created successfully
 */
router.post('/', authorize('MANAGER', 'ADMIN'), itemController.createItem);

/**
 * @swagger
 * /api/items/{id}:
 *   get:
 *     summary: Get single item by ID
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
 *     responses:
 *       200:
 *         description: Item details
 *       404:
 *         description: Item not found
 */
router.get('/:id', itemController.getItem);

/**
 * @swagger
 * /api/items/{id}:
 *   put:
 *     summary: Update item (material or finished product)
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Item'
 *     responses:
 *       200:
 *         description: Item updated successfully
 *       404:
 *         description: Item not found
 */
router.put('/:id', authorize('MANAGER', 'ADMIN'), itemController.updateItem);

/**
 * @swagger
 * /api/items/{id}:
 *   delete:
 *     summary: Delete item (soft delete - sets status to INACTIVE)
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Item ID
 *     responses:
 *       200:
 *         description: Item deleted successfully
 *       404:
 *         description: Item not found
 */
router.delete('/:id', authorize('ADMIN'), itemController.deleteItem);

// ==========================================
// SPECIALIZED OPERATIONS
// ==========================================

/**
 * @swagger
 * /api/items/{id}/cost-price:
 *   put:
 *     summary: Update material cost price (Manager only)
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Material item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cost_price:
 *                 type: number
 *                 description: New cost price in VND
 *                 example: 45000
 *     responses:
 *       200:
 *         description: Cost price updated successfully
 *       400:
 *         description: Can only update cost price for raw materials
 */
router.put('/:id/cost-price', authorize('MANAGER', 'ADMIN'), itemController.updateMaterialCostPrice);

/**
 * @swagger
 * /api/items/batch-update-cost-prices:
 *   put:
 *     summary: Batch update multiple material cost prices
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               updates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     item_id:
 *                       type: string
 *                       description: Material item ID
 *                     cost_price:
 *                       type: number
 *                       description: New cost price in VND
 *                 example:
 *                   - item_id: "item_flour"
 *                     cost_price: 15000
 *                   - item_id: "item_sugar"
 *                     cost_price: 12000
 *     responses:
 *       200:
 *         description: Batch update completed
 */
router.put('/batch-update-cost-prices', authorize('MANAGER', 'ADMIN'), itemController.batchUpdateMaterialCostPrices);

/**
 * @swagger
 * /api/items/materials-without-cost:
 *   get:
 *     summary: Get materials without cost prices (for Manager review)
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of materials without cost prices
 */
router.get('/materials-without-cost', authorize('MANAGER', 'ADMIN'), itemController.getMaterialsWithoutCost);

/**
 * @swagger
 * /api/items/recalc-finished-costs:
 *   post:
 *     summary: Recalculate cost_price for all finished products from their active recipes
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All finished product cost prices recalculated
 */
router.post('/recalc-finished-costs', authorize('MANAGER', 'ADMIN'), itemController.recalcAllFinishedProductCosts);

module.exports = router;
