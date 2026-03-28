const express = require('express');
const router = express.Router();
const productionVarianceCostController = require('../controllers/productionVarianceCost.controller');
const { protect, authorize } = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Production Variance Costs
 *   description: Production variance cost tracking and management
 */

// All routes require authentication
router.use(protect);

/**
 * @swagger
 * /api/production-variance-costs:
 *   get:
 *     summary: Get all production variance costs
 *     tags: [Production Variance Costs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED]
 *       - in: query
 *         name: variance_type
 *         schema:
 *           type: string
 *           enum: [SHORTAGE, EXCESS, WASTE]
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
 *         description: List of production variance costs
 */
router.get('/', authorize('MANAGER', 'ADMIN'), productionVarianceCostController.getProductionVarianceCosts);

/**
 * @swagger
 * /api/production-variance-costs/summary:
 *   get:
 *     summary: Get production variance cost summary by period
 *     tags: [Production Variance Costs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [month, week, year]
 *           default: month
 *       - in: query
 *         name: year
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Variance cost summary
 */
router.get('/summary', authorize('MANAGER', 'ADMIN'), productionVarianceCostController.getVarianceCostSummary);

/**
 * @swagger
 * /api/production-variance-costs/{id}:
 *   get:
 *     summary: Get single production variance cost
 *     tags: [Production Variance Costs]
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
 *         description: Production variance cost details
 */
router.get('/:id', authorize('MANAGER', 'ADMIN'), productionVarianceCostController.getProductionVarianceCost);

/**
 * @swagger
 * /api/production-variance-costs/{id}/review:
 *   put:
 *     summary: Approve or reject production variance cost
 *     tags: [Production Variance Costs]
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
 *               action:
 *                 type: string
 *                 enum: [APPROVE, REJECT]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Variance cost reviewed successfully
 */
router.put('/:id/review', authorize('MANAGER', 'ADMIN'), productionVarianceCostController.reviewProductionVarianceCost);

module.exports = router;