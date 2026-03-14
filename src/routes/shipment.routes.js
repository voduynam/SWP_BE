const express = require('express');
const router = express.Router();
const shipmentController = require('../controllers/shipment.controller');
const { protect, authorize } = require('../middlewares/auth');
const upload = require('../middlewares/uploadDeliveryImage');

/**
 * @swagger
 * tags:
 *   name: Shipments
 *   description: Logistics and shipment management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Shipment:
 *       type: object
 *       required:
 *         - shipment_no
 *         - order_id
 *         - from_location_id
 *         - to_location_id
 *         - ship_date
 *       properties:
 *         _id:
 *           type: string
 *           description: Shipment unique identifier
 *           example: "ship_1710241234567"
 *         shipment_no:
 *           type: string
 *           description: Shipment number (auto-generated SHP-XXXX)
 *           example: "SHP-0001"
 *         order_id:
 *           type: string
 *           description: Parent order ID
 *           example: "ord_1710241234567"
 *         from_location_id:
 *           type: string
 *           description: Source location/warehouse ID
 *           example: "loc_kitchen"
 *         to_location_id:
 *           type: string
 *           description: Destination location/store ID
 *           example: "loc_store_001"
 *         ship_date:
 *           type: string
 *           format: date-time
 *           description: Shipment date
 *           example: "2026-03-12T14:00:00Z"
 *         status:
 *           type: string
 *           enum: [DRAFT, PICKED, SHIPPED, IN_TRANSIT, DELIVERED, CANCELLED]
 *           description: Shipment status
 *           example: "SHIPPED"
 *         delivery_photo_url:
 *           type: string
 *           description: Delivery proof photo URL (nullable)
 *           example: "https://cloudinary.com/delivery_photo_123.jpg"
 *           nullable: true
 *         delivery_photo_uploaded_at:
 *           type: string
 *           format: date-time
 *           description: When delivery photo was uploaded
 *           example: "2026-03-12T16:30:00Z"
 *           nullable: true
 *         created_by:
 *           type: string
 *           description: User ID who created the shipment
 *           example: "user_123"
 *       example:
 *         _id: "ship_1710241234567"
 *         shipment_no: "SHP-0001"
 *         order_id: "ord_1710241234567"
 *         from_location_id: "loc_kitchen"
 *         to_location_id: "loc_store_001"
 *         ship_date: "2026-03-12T14:00:00Z"
 *         status: "SHIPPED"
 *         delivery_photo_url: null
 *         delivery_photo_uploaded_at: null
 *         created_by: "user_123"
 *
 *     ShipmentLine:
 *       type: object
 *       required:
 *         - item_id
 *         - qty
 *         - uom_id
 *       properties:
 *         _id:
 *           type: string
 *           description: Shipment line unique identifier
 *           example: "ship_line_1710241234567_0"
 *         shipment_id:
 *           type: string
 *           description: Parent shipment ID
 *           example: "ship_1710241234567"
 *         item_id:
 *           type: string
 *           description: Item/Product ID
 *           example: "item_001"
 *         qty:
 *           type: number
 *           description: Quantity shipped
 *           example: 10
 *         uom_id:
 *           type: string
 *           description: Unit of Measure ID
 *           example: "uom_kg"
 *         order_line_id:
 *           type: string
 *           description: Reference to original order line (nullable)
 *           example: "ord_line_1710241234567_0"
 *           nullable: true
 *       example:
 *         _id: "ship_line_1710241234567_0"
 *         shipment_id: "ship_1710241234567"
 *         item_id: "item_001"
 *         qty: 10
 *         uom_id: "uom_kg"
 *         order_line_id: "ord_line_1710241234567_0"
 */

// All routes require authentication
router.use(protect);

/**
 * @swagger
 * /api/shipments:
 *   get:
 *     summary: Get all shipments
 *     tags: [Shipments]
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
 *     tags: [Shipments]
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
 *     tags: [Shipments]
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
 *     summary: Update shipment status + Upload delivery photo (when DELIVERED)
 *     tags: [Shipments]
 *     description: |
 *       Cập nhật status của shipment.
 *       
 *       Khi status=DELIVERED, có thể upload ảnh chứng minh giao hàng.
 *       Ảnh sẽ tự động upload lên Cloudinary.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "Shipment ID"
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: ["DRAFT", "PICKED", "SHIPPED", "IN_TRANSIT", "DELIVERED", "CANCELLED"]
 *                 description: "Status của shipment"
 *                 example: "DELIVERED"
 *               delivery_photo:
 *                 type: string
 *                 format: binary
 *                 description: "Ảnh chứng minh giao hàng (khi status=DELIVERED, tùy chọn)"
 *     responses:
 *       200:
 *         description: Status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     shipment_no:
 *                       type: string
 *                     status:
 *                       type: string
 *                       example: "DELIVERED"
 *                     delivery_photo_url:
 *                       type: string
 *                       description: "URL ảnh từ Cloudinary (nếu upload)"
 *                     delivery_photo_uploaded_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad request - Invalid status
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Shipment not found
 *       413:
 *         description: Payload too large - File quá lớn (max 5MB)
 */
router.put('/:id/status', authorize('CHEF', 'DRIVER', 'SUPPLY_COORDINATOR', 'MANAGER', 'ADMIN'), upload.single('delivery_photo'), shipmentController.updateShipmentStatus);

/**
 * @swagger
 * /api/shipments/{id}/dispatch:
 *   put:
 *     summary: Confirm shipment dispatch (Deduct stock from CK)
 *     tags: [Shipments]
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
