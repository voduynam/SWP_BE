const express = require('express');
const router = express.Router();
const lotController = require('../controllers/lot.controller');
const { protect, authorize } = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Lots
 *   description: Batch and lot tracking for inventory items
 */

// All routes require authentication
router.use(protect);

/**
 * @swagger
 * /api/lots:
 *   get:
 *     summary: Get all lots
 *     tags: [Lots]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of lots
 */
router.get('/', lotController.getLots);

/**
 * @swagger
 * /api/lots/{id}:
 *   get:
 *     summary: Get single lot details
 *     tags: [Lots]
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
 *         description: Lot details
 */
router.get('/:id', lotController.getLot);

/**
 * @swagger
 * /api/lots:
 *   post:
 *     summary: Create new lot/batch
 *     tags: [Lots]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               lot_number:
 *                 type: string
 *               expiry_date:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Lot created
 */
router.post('/', authorize('CHEF', 'MANAGER', 'ADMIN'), lotController.createLot);

/**
 * @swagger
 * /api/lots/{id}:
 *   put:
 *     summary: Update lot details
 *     tags: [Lots]
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
 *         description: Lot updated
 */
router.put('/:id', authorize('CHEF', 'MANAGER', 'ADMIN'), lotController.updateLot);

module.exports = router;
/**
 * @swagger
 * /api/lots/expiry-status:
 *   get:
 *     summary: Get lots filtered by expiry status
 *     tags: [Lots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [ACTIVE, NEAR_EXPIRY, EXPIRED, DISPOSED, CONSUMED]
 *       - in: query
 *         name: location_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: item_type
 *         schema:
 *           type: string
 *           enum: [RAW, FINISHED]
 *       - in: query
 *         name: days_to_expiry
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Filtered lots with expiry information
 */
router.get('/expiry-status', lotController.getLotsByExpiryStatus);

/**
 * @swagger
 * /api/lots/expiry-summary:
 *   get:
 *     summary: Get expiry summary and alerts
 *     tags: [Lots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: location_id
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Expiry summary with counts and alerts
 */
router.get('/expiry-summary', lotController.getExpirySummary);

/**
 * @swagger
 * /api/lots/{id}/dispose:
 *   put:
 *     summary: Dispose expired lot
 *     tags: [Lots]
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
 *               disposal_reason:
 *                 type: string
 *               disposal_notes:
 *                 type: string
 *               disposal_method:
 *                 type: string
 *                 enum: [TRASH, COMPOST, RETURN_SUPPLIER, RECYCLE, OTHER]
 *               quantity_disposed:
 *                 type: number
 *     responses:
 *       200:
 *         description: Lot disposed successfully
 */
router.put('/:id/dispose', authorize('MANAGER', 'ADMIN', 'CHEF'), lotController.disposeLot);

/**
 * @swagger
 * /api/lots/update-expiry-status:
 *   put:
 *     summary: Update expiry status for all lots (automated service)
 *     tags: [Lots]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Expiry status updated successfully
 */
router.put('/update-expiry-status', authorize('ADMIN'), lotController.updateExpiryStatus);