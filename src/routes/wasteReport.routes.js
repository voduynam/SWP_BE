const express = require('express');
const router = express.Router();
const wasteReportController = require('../controllers/wasteReport.controller');
const { protect, authorize } = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Waste Reports
 *   description: Waste tracking and reporting system
 */

// All routes require authentication
router.use(protect);

/**
 * @swagger
 * /api/waste-reports/summary:
 *   get:
 *     summary: Get waste summary report
 *     tags: [Waste Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *       - in: query
 *         name: location_id
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Waste summary with categories and totals
 */
router.get('/summary', authorize('MANAGER', 'ADMIN'), wasteReportController.getWasteSummary);

/**
 * @swagger
 * /api/waste-reports/by-category:
 *   get:
 *     summary: Get waste report by category
 *     tags: [Waste Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: waste_type
 *         schema:
 *           type: string
 *           enum: [EXPIRED_MATERIAL, RETURN_REPLACEMENT, PRODUCTION_WASTE, DISPOSAL]
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
 *       - in: query
 *         name: location_id
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detailed waste transactions by category
 */
router.get('/by-category', authorize('MANAGER', 'ADMIN'), wasteReportController.getWasteByCategory);

/**
 * @swagger
 * /api/waste-reports/top-wasted-items:
 *   get:
 *     summary: Get top wasted items
 *     tags: [Waste Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *       - in: query
 *         name: location_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Top wasted items by value and quantity
 */
router.get('/top-wasted-items', authorize('MANAGER', 'ADMIN'), wasteReportController.getTopWastedItems);

/**
 * @swagger
 * /api/waste-reports/cost-analysis:
 *   get:
 *     summary: Get waste cost analysis
 *     tags: [Waste Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *       - in: query
 *         name: location_id
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detailed cost analysis with trends and disposal methods
 */
router.get('/cost-analysis', authorize('MANAGER', 'ADMIN'), wasteReportController.getWasteCostAnalysis);

/**
 * @swagger
 * /api/waste-reports/transactions:
 *   get:
 *     summary: Get all waste transactions
 *     tags: [Waste Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: waste_type
 *         schema:
 *           type: string
 *           enum: [EXPIRED_MATERIAL, RETURN_REPLACEMENT, PRODUCTION_WASTE, DISPOSAL]
 *       - in: query
 *         name: reference_type
 *         schema:
 *           type: string
 *           enum: [LOT, RETURN_REQUEST, PRODUCTION_ORDER, MANUAL_DISPOSAL]
 *       - in: query
 *         name: disposal_method
 *         schema:
 *           type: string
 *           enum: [TRASH, COMPOST, RETURN_SUPPLIER, RECYCLE, OTHER]
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
 *       - in: query
 *         name: location_id
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of waste transactions with details
 */
router.get('/transactions', authorize('MANAGER', 'ADMIN', 'CHEF'), wasteReportController.getWasteTransactions);

module.exports = router;