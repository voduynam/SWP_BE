const express = require('express');
const router = express.Router();
const shipmentController = require('../controllers/shipment.controller');
const { protect, authorize } = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: 5. Shipment Flow
 *   description: Logistics and shipment management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Shipment:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         shipment_no:
 *           type: string
 *         order_id:
 *           type: string
 *         from_location_id:
 *           type: string
 *         to_location_id:
 *           type: string
 *         ship_date:
 *           type: string
 *           format: date
 *         status:
 *           type: string
 *           enum: [DRAFT, PICKED, SHIPPED, IN_TRANSIT, DELIVERED, CANCELLED]
 *         created_by:
 *           type: string
 *     ShipmentLine:
 *       type: object
 *       properties:
 *         item_id:
 *           type: string
 *         qty:
 *           type: number
 *         uom_id:
 *           type: string
 */

// All routes require authentication
router.use(protect);

/**
 * @swagger
 * /api/shipments:
 *   get:
 *     summary: Get all shipments
 *     tags: [5. Shipment Flow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of shipments
 */
router.get('/', shipmentController.getShipments);

/**
 * @swagger
 * /api/shipments/{id}:
 *   get:
 *     summary: Get single shipment with lines
 *     tags: [5. Shipment Flow]
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
 *         description: Shipment details
 */
router.get('/:id', shipmentController.getShipment);

/**
 * @swagger
 * /api/shipments:
 *   post:
 *     summary: Create shipment from order
 *     tags: [5. Shipment Flow]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               order_id:
 *                 type: string
 *               from_location_id:
 *                 type: string
 *               to_location_id:
 *                 type: string
 *               lines:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/ShipmentLine'
 *     responses:
 *       201:
 *         description: Shipment created
 */
router.post('/', authorize('CHEF', 'MANAGER', 'ADMIN'), shipmentController.createShipment);

/**
 * @swagger
 * /api/shipments/{id}/status:
 *   put:
 *     summary: Update shipment status
 *     tags: [5. Shipment Flow]
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
 *                 enum: [DRAFT, PICKED, SHIPPED, IN_TRANSIT, DELIVERED, CANCELLED]
 *     responses:
 *       200:
 *         description: Status updated
 */
router.put('/:id/status', shipmentController.updateShipmentStatus);

/**
 * @swagger
 * /api/shipments/{id}/dispatch:
 *   put:
 *     summary: Confirm shipment dispatch (Deduct stock from CK)
 *     tags: [5. Shipment Flow]
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
 *         description: Shipment dispatched and stock deducted
 */
router.put('/:id/dispatch', authorize('CHEF', 'MANAGER', 'ADMIN'), shipmentController.confirmDispatch);

module.exports = router;
