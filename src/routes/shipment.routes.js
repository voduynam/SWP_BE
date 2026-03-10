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
router.put('/:id/status', upload.single('delivery_photo'), shipmentController.updateShipmentStatus);

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
