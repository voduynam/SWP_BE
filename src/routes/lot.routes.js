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
