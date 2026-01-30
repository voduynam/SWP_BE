const express = require('express');
const router = express.Router();
const internalOrderController = require('../controllers/internalOrder.controller');
const { protect, authorize } = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Internal Orders
 *   description: Store-to-Kitchen internal order management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     InternalOrder:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         order_no:
 *           type: string
 *         store_org_unit_id:
 *           type: string
 *         order_date:
 *           type: string
 *           format: date
 *         status:
 *           type: string
 *           enum: [DRAFT, SUBMITTED, APPROVED, PROCESSING, SHIPPED, RECEIVED, CANCELLED]
 *         total_amount:
 *           type: number
 *         is_urgent:
 *           type: boolean
 *         created_by:
 *           type: string
 *     InternalOrderLine:
 *       type: object
 *       properties:
 *         item_id:
 *           type: string
 *         qty_ordered:
 *           type: number
 *         uom_id:
 *           type: string
 *         unit_price:
 *           type: number
 */

// All routes require authentication
router.use(protect);

/**
 * @swagger
 * /api/internal-orders:
 *   get:
 *     summary: Get all internal orders
 *     tags: [Internal Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: store_org_unit_id
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of internal orders
 */
router.get('/', internalOrderController.getInternalOrders);

/**
 * @swagger
 * /api/internal-orders/{id}:
 *   get:
 *     summary: Get single internal order with lines
 *     tags: [Internal Orders]
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
 *         description: Order details
 */
router.get('/:id', internalOrderController.getInternalOrder);

/**
 * @swagger
 * /api/internal-orders:
 *   post:
 *     summary: Create internal order
 *     tags: [Internal Orders]
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
 *                   $ref: '#/components/schemas/InternalOrderLine'
 *               is_urgent:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Order created
 */
router.post('/', authorize('STORE_STAFF', 'MANAGER', 'ADMIN'), internalOrderController.createInternalOrder);

/**
 * @swagger
 * /api/internal-orders/{id}/status:
 *   put:
 *     summary: Update internal order status
 *     tags: [Internal Orders]
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
 *                 enum: [DRAFT, SUBMITTED, APPROVED, PROCESSING, SHIPPED, RECEIVED, CANCELLED]
 *     responses:
 *       200:
 *         description: Status updated
 */
router.put('/:id/status', internalOrderController.updateOrderStatus);

/**
 * @swagger
 * /api/internal-orders/{id}/lines:
 *   post:
 *     summary: Add line to internal order
 *     tags: [Internal Orders]
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
 *             $ref: '#/components/schemas/InternalOrderLine'
 *     responses:
 *       201:
 *         description: Line added
 */
router.post('/:id/lines', internalOrderController.addOrderLine);

module.exports = router;
