const express = require('express');
const router = express.Router();
const {
    getConsolidatedOrders,
    generateConsolidatedSummary,
    getConsolidatedByDate
} = require('../controllers/consolidatedOrder.controller');
const { protect, authorize } = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Consolidated Orders
 *   description: Order consolidation and kitchen planning
 */

// All routes require authentication
router.use(protect);

/**
 * @swagger
 * /api/consolidated-orders:
 *   get:
 *     summary: Get all consolidated orders
 *     tags: [Consolidated Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of consolidated orders
 */
router.route('/')
    .get(authorize('ADMIN', 'MANAGER', 'SUPPLY_COORDINATOR'), getConsolidatedOrders);

/**
 * @swagger
 * /api/consolidated-orders/generate:
 *   post:
 *     summary: Generate consolidated summary for a date range
 *     tags: [Consolidated Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               start_date:
 *                 type: string
 *                 format: date
 *               end_date:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Consolidated summary generated
 */
router.route('/generate')
    .post(authorize('ADMIN', 'MANAGER', 'SUPPLY_COORDINATOR'), generateConsolidatedSummary);

/**
 * @swagger
 * /api/consolidated-orders/{date}:
 *   get:
 *     summary: Get consolidated order by date
 *     tags: [Consolidated Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Consolidated order details
 */
router.route('/:date')
    .get(authorize('ADMIN', 'MANAGER', 'SUPPLY_COORDINATOR'), getConsolidatedByDate);

module.exports = router;
