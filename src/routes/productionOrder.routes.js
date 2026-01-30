const express = require('express');
const router = express.Router();
const productionOrderController = require('../controllers/productionOrder.controller');
const { protect, authorize } = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: 4. Production Flow
 *   description: Central Kitchen production management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ProductionOrder:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         production_no:
 *           type: string
 *         order_date:
 *           type: string
 *           format: date
 *         status:
 *           type: string
 *           enum: [PLANNED, RELEASED, IN_PROGRESS, COMPLETED, CANCELLED]
 *         location_id:
 *           type: string
 *     ProductionLine:
 *       type: object
 *       properties:
 *         item_id:
 *           type: string
 *         recipe_id:
 *           type: string
 *         qty_planned:
 *           type: number
 */

// All routes require authentication
router.use(protect);

/**
 * @swagger
 * /api/production-orders:
 *   get:
 *     summary: Get all production orders
 *     tags: [4. Production Flow]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of production orders
 */
router.get('/', productionOrderController.getProductionOrders);

/**
 * @swagger
 * /api/production-orders/{id}:
 *   get:
 *     summary: Get single production order with lines
 *     tags: [4. Production Flow]
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
 *         description: Production order details
 */
router.get('/:id', productionOrderController.getProductionOrder);

/**
 * @swagger
 * /api/production-orders:
 *   post:
 *     summary: Create production order
 *     tags: [4. Production Flow]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               lines:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/ProductionLine'
 *     responses:
 *       201:
 *         description: Production order created
 */
router.post('/', authorize('CHEF', 'MANAGER', 'ADMIN'), productionOrderController.createProductionOrder);

/**
 * @swagger
 * /api/production-orders/{id}/status:
 *   put:
 *     summary: Update production order status
 *     tags: [4. Production Flow]
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
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PLANNED, RELEASED, IN_PROGRESS, COMPLETED, CANCELLED]
 *     responses:
 *       200:
 *         description: Status updated
 */
router.put('/:id/status', authorize('CHEF', 'MANAGER', 'ADMIN'), productionOrderController.updateProductionOrderStatus);

/**
 * @swagger
 * /api/production-orders/{id}/consumption:
 *   post:
 *     summary: Record production consumption
 *     tags: [4. Production Flow]
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
 *             type: object
 *             properties:
 *               material_item_id:
 *                 type: string
 *               qty:
 *                 type: number
 *               lot_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Consumption recorded
 */
router.post('/:id/consumption', authorize('CHEF', 'MANAGER', 'ADMIN'), productionOrderController.recordConsumption);

/**
 * @swagger
 * /api/production-orders/{id}/output:
 *   post:
 *     summary: Record production output
 *     tags: [4. Production Flow]
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
 *             type: object
 *             properties:
 *               item_id:
 *                 type: string
 *               qty:
 *                 type: number
 *               lot_code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Output recorded
 */
router.post('/:id/output', authorize('CHEF', 'MANAGER', 'ADMIN'), productionOrderController.recordOutput);

module.exports = router;
