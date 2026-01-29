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

module.exports = router;
