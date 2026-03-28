const express = require('express');
const router = express.Router();
const productionOrderController = require('../controllers/productionOrder.controller');
const { protect, authorize } = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Production Orders
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
 *     tags: [Production Orders]
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
 *     tags: [Production Orders]
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
 *     tags: [Production Orders]
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
 *     tags: [Production Orders]
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
 *     tags: [Production Orders]
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
 *     tags: [Production Orders]
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

/**
 * @swagger
 * /api/production-orders/{id}/variance-check:
 *   get:
 *     summary: Check production variance and suggest compensation
 *     tags: [Production Orders]
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
 *         description: Production variance analysis
 */
router.get('/:id/variance-check', authorize('CHEF', 'MANAGER', 'ADMIN'), productionOrderController.checkProductionVariance);

/**
 * @swagger
 * /api/production-orders/{id}/compensate:
 *   post:
 *     summary: Create compensating production order for shortage
 *     tags: [Production Orders]
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
 *               shortage_items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     item_id:
 *                       type: string
 *                     shortage_qty:
 *                       type: number
 *               reason:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [NORMAL, URGENT]
 *     responses:
 *       201:
 *         description: Compensating production order created
 */
router.post('/:id/compensate', authorize('CHEF', 'MANAGER', 'ADMIN'), productionOrderController.compensateProductionShortage);

/**
 * @swagger
 * /api/production-orders/{id}/execute-compensation:
 *   post:
 *     summary: Execute compensating production with automatic material consumption
 *     tags: [Production Orders]
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
 *         description: Compensating production executed successfully
 */
router.post('/:id/execute-compensation', authorize('CHEF', 'MANAGER', 'ADMIN'), productionOrderController.executeCompensatingProduction);

/**
 * @swagger
 * /api/production-orders/{id}/waste:
 *   post:
 *     summary: Record production waste
 *     tags: [Production Orders]
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
 *               waste_items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     item_id:
 *                       type: string
 *                     lot_id:
 *                       type: string
 *                     quantity_wasted:
 *                       type: number
 *                     uom_id:
 *                       type: string
 *                     reason:
 *                       type: string
 *                     notes:
 *                       type: string
 *                     disposal_method:
 *                       type: string
 *                       enum: [TRASH, COMPOST, RETURN_SUPPLIER, RECYCLE, OTHER]
 *     responses:
 *       201:
 *         description: Production waste recorded successfully
 */
router.post('/:id/waste', authorize('CHEF', 'MANAGER', 'ADMIN'), productionOrderController.recordProductionWaste);

module.exports = router;