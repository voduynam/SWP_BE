const express = require('express');
const router = express.Router();
const {
    getMetrics,
    getMetricsByType,
    calculateDeliveryPerformance,
    calculateOrderFulfillment,
    calculateExceptionHandling,
    getDashboard
} = require('../controllers/performanceMetrics.controller');
const { protect, authorize } = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: 11. Dashboard & Analytics
 *   description: KPI tracking and analytical dashboard data
 */

// All routes require authentication
router.use(protect);
router.use(authorize('ADMIN', 'MANAGER', 'SUPPLY_COORDINATOR'));

/**
 * @swagger
 * /api/performance-metrics/dashboard:
 *   get:
 *     summary: Get dashboard KPIs and metrics
 *     tags: [11. Dashboard & Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data
 */
router.route('/dashboard')
    .get(getDashboard);

/**
 * @swagger
 * /api/performance-metrics/calculate/delivery:
 *   post:
 *     summary: Calculate delivery performance metrics
 *     tags: [11. Dashboard & Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Metrics calculated
 */
router.route('/calculate/delivery')
    .post(calculateDeliveryPerformance);

/**
 * @swagger
 * /api/performance-metrics/calculate/fulfillment:
 *   post:
 *     summary: Calculate order fulfillment metrics
 *     tags: [11. Dashboard & Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Metrics calculated
 */
router.route('/calculate/fulfillment')
    .post(calculateOrderFulfillment);

/**
 * @swagger
 * /api/performance-metrics/calculate/exceptions:
 *   post:
 *     summary: Calculate exception handling metrics
 *     tags: [11. Dashboard & Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Metrics calculated
 */
router.route('/calculate/exceptions')
    .post(calculateExceptionHandling);

/**
 * @swagger
 * /api/performance-metrics:
 *   get:
 *     summary: Get all metrics
 *     tags: [11. Dashboard & Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of metrics
 */
router.route('/')
    .get(getMetrics);

/**
 * @swagger
 * /api/performance-metrics/{type}:
 *   get:
 *     summary: Get metrics by type
 *     tags: [11. Dashboard & Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [DELIVERY, FULFILLMENT, EXCEPTION]
 *     responses:
 *       200:
 *         description: Filtered metrics
 */
router.route('/:type')
    .get(getMetricsByType);

module.exports = router;
