const express = require('express');
const router = express.Router();
const returnRequestController = require('../controllers/returnRequest.controller');
const { protect, authorize } = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Return Requests
 *   description: Managing returns from stores to Central Kitchen
 */

// All routes require authentication
router.use(protect);

/**
 * @swagger
 * /api/return-requests:
 *   get:
 *     summary: Get all return requests
 *     tags: [Return Requests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of return requests
 */
router.get('/', returnRequestController.getReturnRequests);

/**
 * @swagger
 * /api/return-requests/{id}:
 *   get:
 *     summary: Get single return request with lines
 *     tags: [Return Requests]
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
 *         description: Return request details
 */
router.get('/:id', returnRequestController.getReturnRequest);

/**
 * @swagger
 * /api/return-requests:
 *   post:
 *     summary: Create new return request with evidence photos
 *     tags: [Return Requests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               store_org_unit_id:
 *                 type: string
 *               goods_receipt_id:
 *                 type: string
 *               reason:
 *                 type: string
 *               lines:
 *                 type: string
 *                 description: JSON string of return lines
 *               evidence_photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 5
 *     responses:
 *       201:
 *         description: Return request created with evidence photos
 */
router.post('/', authorize('STORE_STAFF', 'MANAGER', 'ADMIN'), returnRequestController.createReturnRequest);

/**
 * @swagger
 * /api/return-requests/{id}/review:
 *   put:
 *     summary: Manager approve or reject return request
 *     tags: [Return Requests]
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
 *                 description: Required when action is REJECT
 *     responses:
 *       200:
 *         description: Return request reviewed successfully
 */
router.put('/:id/review', authorize('MANAGER', 'ADMIN'), returnRequestController.reviewReturnRequest);

/**
 * @swagger
 * /api/return-requests/{id}/status:
 *   put:
 *     summary: Update return request status (legacy endpoint)
 *     tags: [Return Requests]
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
 *     responses:
 *       200:
 *         description: Status updated
 */
router.put('/:id/status', authorize('MANAGER', 'ADMIN'), returnRequestController.updateReturnStatus);

/**
 * @swagger
 * /api/return-requests/{id}/process:
 *   put:
 *     summary: Process return and update inventory
 *     tags: [Return Requests]
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
 *         description: Return processed and inventory updated
 */
router.put('/:id/process', authorize('MANAGER', 'ADMIN'), returnRequestController.processReturn);

module.exports = router;
