const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alert.controller');
const { protect } = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Alerts
 *   description: Automated inventory and expiry alerts
 */

// All routes require authentication
router.use(protect);

/**
 * @swagger
 * /api/alerts/expiry:
 *   get:
 *     summary: Get items approaching expiry
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of expiry alerts
 */
router.get('/expiry', alertController.getExpiryAlerts);

/**
 * @swagger
 * /api/alerts/low-stock:
 *   get:
 *     summary: Get items with low stock levels
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of low stock alerts
 */
router.get('/low-stock', alertController.getLowStockAlerts);

/**
 * @swagger
 * /api/alerts/summary:
 *   get:
 *     summary: Get count of all active alerts
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Alert summary count
 */
router.get('/summary', alertController.getAlertsSummary);

module.exports = router;
