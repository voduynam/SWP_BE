const express = require('express');
const router = express.Router();
const performanceController = require('../controllers/performance.controller');
const { protect, authorize } = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Performance
 *   description: Performance management and violation tracking
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     PerformanceViolation:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Violation unique identifier
 *         violation_type:
 *           type: string
 *           enum: [PRODUCTION_SHORTAGE, PRODUCTION_QUALITY, PRODUCTION_DELAY, COORDINATOR_ASSIGNMENT, COORDINATOR_HANDOVER, DRIVER_DELAY, DRIVER_COD_ERROR]
 *           description: Type of performance violation
 *         user_id:
 *           type: string
 *           description: User who committed the violation
 *         user_role:
 *           type: string
 *           enum: [CHEF, SUPPLY_COORDINATOR, DRIVER]
 *           description: Role of the user
 *         reference_type:
 *           type: string
 *           enum: [PRODUCTION_ORDER, SHIPMENT, DELIVERY_ROUTE, PAYMENT]
 *           description: Type of related entity
 *         reference_id:
 *           type: string
 *           description: ID of related entity
 *         title:
 *           type: string
 *           description: Short title of the violation
 *         description:
 *           type: string
 *           description: Detailed description of the violation
 *         severity:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *           description: Severity level of the violation
 *         detected_at:
 *           type: string
 *           format: date-time
 *           description: When the violation was detected
 *         manager_reviewed:
 *           type: boolean
 *           description: Whether manager has reviewed this violation
 *         manager_decision:
 *           type: string
 *           enum: [CONFIRMED, DISMISSED, PENDING]
 *           description: Manager's decision on the violation
 *         status:
 *           type: string
 *           enum: [OPEN, UNDER_REVIEW, CONFIRMED, DISMISSED, RESOLVED]
 *           description: Current status of the violation
 */

// All routes require authentication
router.use(protect);

/**
 * @swagger
 * /api/performance/violations:
 *   get:
 *     summary: Get all performance violations for manager review
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [OPEN, UNDER_REVIEW, CONFIRMED, DISMISSED, RESOLVED]
 *         description: Filter by violation status
 *       - in: query
 *         name: violation_type
 *         schema:
 *           type: string
 *         description: Filter by violation type
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *         description: Filter by severity
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of performance violations
 */
router.get('/violations', authorize('MANAGER', 'ADMIN'), performanceController.getViolations);

/**
 * @swagger
 * /api/performance/violations/{id}:
 *   get:
 *     summary: Get single violation details
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Violation ID
 *     responses:
 *       200:
 *         description: Violation details with related data
 */
router.get('/violations/:id', authorize('MANAGER', 'ADMIN'), performanceController.getViolation);

/**
 * @swagger
 * /api/performance/violations/{id}/review:
 *   put:
 *     summary: Manager review violation (confirm or dismiss)
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Violation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - manager_decision
 *             properties:
 *               manager_decision:
 *                 type: string
 *                 enum: [CONFIRMED, DISMISSED]
 *                 description: Manager's decision on the violation
 *               manager_notes:
 *                 type: string
 *                 description: Manager's notes about the decision
 *               resolution_required:
 *                 type: boolean
 *                 description: Whether resolution action is required
 *               resolution_notes:
 *                 type: string
 *                 description: Notes about required resolution
 *     responses:
 *       200:
 *         description: Violation reviewed successfully
 */
router.put('/violations/:id/review', authorize('MANAGER', 'ADMIN'), performanceController.reviewViolation);

/**
 * @swagger
 * /api/performance/dashboard:
 *   get:
 *     summary: Get performance dashboard data
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [1d, 7d, 30d]
 *           default: 7d
 *         description: Time period for statistics
 *     responses:
 *       200:
 *         description: Performance dashboard data
 */
router.get('/dashboard', authorize('MANAGER', 'ADMIN'), performanceController.getDashboard);

/**
 * @swagger
 * /api/performance/run-checks:
 *   post:
 *     summary: Run performance checks manually
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Performance checks completed
 */
router.post('/run-checks', authorize('MANAGER', 'ADMIN'), performanceController.runPerformanceChecks);

/**
 * @swagger
 * /api/performance/users/{userId}/history:
 *   get:
 *     summary: Get user performance history
 *     tags: [Performance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for history
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for history
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: User performance history
 */
router.get('/users/:userId/history', authorize('MANAGER', 'ADMIN'), performanceController.getUserPerformanceHistory);

module.exports = router;