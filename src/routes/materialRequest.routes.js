const express = require('express');
const router = express.Router();
const materialRequestController = require('../controllers/materialRequest.controller');
const { protect, authorize } = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Material Requests
 *   description: Managing material requests from kitchen staff to managers
 */

// All routes require authentication
router.use(protect);

/**
 * @swagger
 * /api/material-requests:
 *   get:
 *     summary: Get all material requests
 *     tags: [Material Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED, PROCESSING, COMPLETED, CANCELLED]
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, URGENT]
 *       - in: query
 *         name: request_reason
 *         schema:
 *           type: string
 *           enum: [PRODUCTION_SHORTAGE, EXPIRED_MATERIAL, QUALITY_ISSUE, STOCK_OUT, EMERGENCY, OTHER]
 *     responses:
 *       200:
 *         description: List of material requests
 */
router.get('/', materialRequestController.getMaterialRequests);

/**
 * @swagger
 * /api/material-requests/{id}:
 *   get:
 *     summary: Get single material request with lines
 *     tags: [Material Requests]
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
 *         description: Material request details
 */
router.get('/:id', materialRequestController.getMaterialRequest);

/**
 * @swagger
 * /api/material-requests:
 *   post:
 *     summary: Create new material request
 *     tags: [Material Requests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH, URGENT]
 *               request_reason:
 *                 type: string
 *                 enum: [PRODUCTION_SHORTAGE, EXPIRED_MATERIAL, QUALITY_ISSUE, STOCK_OUT, EMERGENCY, OTHER]
 *               production_order_id:
 *                 type: string
 *               location_id:
 *                 type: string
 *               notes:
 *                 type: string
 *               expected_delivery:
 *                 type: string
 *                 format: date
 *               lines:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     item_id:
 *                       type: string
 *                     quantity_requested:
 *                       type: number
 *                     uom_id:
 *                       type: string
 *                     minimum_required:
 *                       type: number
 *                     urgency_level:
 *                       type: string
 *                       enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *                     reason:
 *                       type: string
 *     responses:
 *       201:
 *         description: Material request created
 */
router.post('/', authorize('CHEF', 'MANAGER', 'ADMIN'), materialRequestController.createMaterialRequest);

/**
 * @swagger
 * /api/material-requests/{id}/review:
 *   put:
 *     summary: Manager approve or reject material request
 *     tags: [Material Requests]
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
 *               rejection_reason:
 *                 type: string
 *               approved_quantities:
 *                 type: object
 *               expected_delivery:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Material request reviewed successfully
 */
router.put('/:id/review', authorize('MANAGER', 'ADMIN'), materialRequestController.reviewMaterialRequest);

/**
 * @swagger
 * /api/material-requests/stock-check:
 *   get:
 *     summary: Check stock levels and suggest material requests
 *     tags: [Material Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: location_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Stock check results with suggestions
 */
router.get('/stock-check', authorize('CHEF', 'MANAGER', 'ADMIN'), materialRequestController.checkStockLevels);

/**
 * @swagger
 * /api/material-requests/{id}/status:
 *   put:
 *     summary: Update material request status
 *     tags: [Material Requests]
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
 *                 enum: [PENDING, APPROVED, REJECTED, PROCESSING, COMPLETED, CANCELLED]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated
 */
router.put('/:id/status', authorize('MANAGER', 'ADMIN'), materialRequestController.updateMaterialRequestStatus);

module.exports = router;