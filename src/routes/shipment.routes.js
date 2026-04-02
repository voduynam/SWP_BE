const express = require('express');
const router = express.Router();
const shipmentController = require('../controllers/shipment.controller');
const { protect, authorize } = require('../middlewares/auth');
const upload = require('../middlewares/uploadDeliveryImage');
const optionalUpload = require('../middlewares/optionalUpload');

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
 * /api/shipments/check-pending-receipts:
 *   get:
 *     summary: Check pending receipts and send notifications
 *     tags: [Shipments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending receipts check completed
 */
router.get('/check-pending-receipts', authorize('MANAGER', 'ADMIN'), shipmentController.checkPendingReceipts);

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
router.post('/', authorize('CHEF', 'MANAGER', 'ADMIN', 'SUPPLY_COORDINATOR'), shipmentController.createShipment);

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
router.put('/:id/status', authorize('CHEF', 'MANAGER', 'ADMIN', 'DRIVER', 'SUPPLY_COORDINATOR'), upload.fields([
  { name: 'delivery_photo', maxCount: 1 },
  { name: 'cod_evidence_photos', maxCount: 3 }
]), shipmentController.updateShipmentStatus);

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
router.put('/:id/dispatch', authorize('CHEF', 'MANAGER', 'ADMIN', 'SUPPLY_COORDINATOR'), shipmentController.confirmDispatch);

// @desc    Update COD status (Manager confirmation)
// @route   PUT /api/shipments/:id/cod-status
// @access  Private (Manager, Admin)
router.put('/:id/cod-status', authorize('MANAGER', 'ADMIN'), shipmentController.updateCODStatus);

/**
 * @swagger
 * /api/shipments/{id}/collect-cod:
 *   put:
 *     summary: Collect COD payment (Driver)
 *     tags: [Shipments]
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
 *               collected_amount:
 *                 type: number
 *                 description: Amount collected from customer
 *               notes:
 *                 type: string
 *                 description: Additional notes
 *     responses:
 *       200:
 *         description: COD collected successfully
 */
router.put('/:id/collect-cod', protect, shipmentController.collectCOD);

/**
 * @swagger
 * /api/shipments/{id}/confirm-receipt:
 *   put:
 *     summary: Staff confirm receipt of shipment
 *     tags: [Shipments]
 *     description: |
 *       Staff xác nhận đã nhận hàng từ shipment.
 *       
 *       Khi báo cáo có vấn đề (RECEIVED_WITH_ISSUES) hoặc chưa nhận được hàng (NOT_RECEIVED),
 *       PHẢI upload ảnh/video bằng chứng.
 *       
 *       Hỗ trợ formats:
 *       - Images: JPEG, JPG, PNG, WEBP, GIF
 *       - Videos: MP4, MOV, AVI, MKV, WEBM
 *       - Max file size: 50MB
 *       - Max files: 5 files
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Shipment ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - receipt_status
 *             properties:
 *               receipt_status:
 *                 type: string
 *                 enum: [RECEIVED_OK, RECEIVED_WITH_ISSUES, NOT_RECEIVED]
 *                 description: Receipt confirmation status
 *               receipt_notes:
 *                 type: string
 *                 description: Notes about the receipt
 *               delivery_discrepancy:
 *                 type: string
 *                 description: Description of any issues or discrepancies
 *               evidence_photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Evidence photos/videos (REQUIRED for RECEIVED_WITH_ISSUES and NOT_RECEIVED). Supports images (JPEG, PNG, WEBP) and videos (MP4, MOV, AVI, MKV, WEBM). Max 50MB per file, max 5 files total.
 *     responses:
 *       200:
 *         description: Receipt confirmed successfully
 *       400:
 *         description: Bad request - Evidence photos/videos required for issues
 */
router.put(
  '/:id/confirm-receipt',
  protect,
  authorize('STORE_STAFF', 'MANAGER', 'ADMIN'),
  optionalUpload('evidence_photos', 5),
  shipmentController.confirmReceipt
);

module.exports = router;
