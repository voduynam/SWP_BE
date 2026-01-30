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
 *       properties:
 *         _id:
 *           type: string
 *         sku:
 *           type: string
 *         name:
 *           type: string
 *         item_type:
 *           type: string
 *           enum: [RAW_MATERIAL, SEMI_FINISHED, FINISHED_GOOD]
 *         base_uom_id:
 *           type: string
 *         category_id:
 *           type: string
 *         is_active:
 *           type: boolean
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
