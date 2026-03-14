const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { protect } = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Operational overview and statistics
 */

// All routes require authentication
router.use(protect);

/**
 * @swagger
 * /api/dashboard/overview:
 *   get:
 *     summary: Get dashboard overview
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard overview data
 */
router.get('/overview', dashboardController.getDashboardOverview);

/**
 * @swagger
 * /api/dashboard/orders:
 *   get:
 *     summary: Get order statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Order statistics
 */
router.get('/orders', dashboardController.getOrderStatistics);

/**
 * @swagger
 * /api/dashboard/production:
 *   get:
 *     summary: Get production statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Production statistics
 */
router.get('/production', dashboardController.getProductionStatistics);

/**
 * @swagger
 * /api/dashboard/inventory:
 *   get:
 *     summary: Get inventory statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory statistics
 */
router.get('/inventory', dashboardController.getInventoryStatistics);

/**
 * @swagger
 * /api/dashboard/shipments:
 *   get:
 *     summary: Get shipment statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Shipment statistics
 */
router.get('/shipments', dashboardController.getShipmentStatistics);

/**
 * @swagger
 * /api/dashboard/profit:
 *   get:
 *     summary: Get profit statistics (Revenue - Cost)
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for the period
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for the period
 *       - in: query
 *         name: org_unit_id
 *         schema:
 *           type: string
 *         description: Organization unit ID to filter by
 *       - in: query
 *         name: group_by
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *         description: How to group profit data (day/week/month)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profit statistics including total profit, margin, trend analysis and top profit items
 */
router.get('/profit', dashboardController.getProfitStatistics);

module.exports = router;
