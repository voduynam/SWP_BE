const express = require('express');
const router = express.Router();
const {
    getDeliveryRoutes,
    getDeliveryRoute,
    createDeliveryRoute,
    updateDeliveryRoute,
    updateRouteStatus,
    addRouteStop,
    updateStopStatus,
    getMyRoutes
} = require('../controllers/deliveryRoute.controller');
const { protect, authorize } = require('../middlewares/auth');
const upload = require('../middlewares/uploadDeliveryImage');

/**
 * @swagger
 * tags:
 *   name: Delivery Routes
 *   description: Route planning and delivery tracking
 */

// All routes require authentication
router.use(protect);

/**
 * @swagger
 * /api/delivery-routes/my-routes/list:
 *   get:
 *     summary: Get my delivery routes (Driver only)
 *     tags: [Delivery Routes]
 *     description: Get all routes assigned to the current driver
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PLANNED, IN_PROGRESS, COMPLETED]
 *     responses:
 *       200:
 *         description: List of driver's routes
 */
// @route   GET /api/delivery-routes/my-routes/list
// @desc    Get driver's assigned routes
// @access  Private/Driver
router.get('/my-routes/list', authorize('DRIVER'), getMyRoutes);

/**
 * @swagger
 * /api/delivery-routes:
 *   get:
 *     summary: Get all delivery routes
 *     tags: [Delivery Routes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of delivery routes
 *   post:
 *     summary: Create new delivery route
 *     tags: [Delivery Routes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - route_name
 *               - driver_id
 *             properties:
 *               route_name:
 *                 type: string
 *                 example: "Route-HCM-001"
 *                 description: "Tên chuyến giao hàng"
 *               driver_id:
 *                 type: string
 *                 example: "user_123"
 *                 description: "ID của tài xế (bắt buộc)"
 *               vehicle_no:
 *                 type: string
 *                 example: "51A-12345"
 *                 description: "Biển số xe (tùy chọn)"
 *               vehicle_type:
 *                 type: string
 *                 enum: ["TRUCK_1TON", "TRUCK_500KG", "VAN", "MOTORCYCLE"]
 *                 example: "TRUCK_1TON"
 *                 description: "Loại xe (tùy chọn)"
 *               planned_date:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-03-15T00:00:00Z"
 *                 description: "Ngày dự kiến giao (mặc định: hôm nay)"
 *               total_distance_km:
 *                 type: number
 *                 example: 50
 *                 description: "Tổng khoảng cách (km) - mặc định: 0"
 *               estimated_duration_mins:
 *                 type: number
 *                 example: 480
 *                 description: "Thời gian ước tính (phút) - mặc định: 0"
 *     responses:
 *       201:
 *         description: Route created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     route_no:
 *                       type: string
 *                     route_name:
 *                       type: string
 *                     status:
 *                       type: string
 *                       example: "PLANNED"
 *       400:
 *         description: Bad request - Missing required fields
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only ADMIN, MANAGER, SUPPLY_COORDINATOR can create
 */
router.route('/')
    .get(authorize('ADMIN', 'MANAGER', 'SUPPLY_COORDINATOR'), getDeliveryRoutes)
    .post(authorize('ADMIN', 'MANAGER', 'SUPPLY_COORDINATOR'), createDeliveryRoute);

/**
 * @swagger
 * /api/delivery-routes/{id}:
 *   get:
 *     summary: Get single delivery route with stops
 *     tags: [Delivery Routes]
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
 *         description: Route details
 *   put:
 *     summary: Update delivery route
 *     tags: [Delivery Routes]
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
 *         description: Route updated
 */
router.route('/:id')
    .get(authorize('ADMIN', 'MANAGER', 'SUPPLY_COORDINATOR'), getDeliveryRoute)
    .put(authorize('ADMIN', 'MANAGER', 'SUPPLY_COORDINATOR'), updateDeliveryRoute);

/**
 * @swagger
 * /api/delivery-routes/{id}/status:
 *   put:
 *     summary: Update overall route status
 *     tags: [Delivery Routes]
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
 *                 enum: [PENDING, IN_TRANSIT, COMPLETED, CANCELLED]
 *     responses:
 *       200:
 *         description: Status updated
 */
router.route('/:id/status')
    .put(authorize('ADMIN', 'MANAGER', 'SUPPLY_COORDINATOR'), updateRouteStatus);

/**
 * @swagger
 * /api/delivery-routes/{id}/stops:
 *   post:
 *     summary: Add stop to delivery route
 *     tags: [Delivery Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Stop added
 */
router.route('/:id/stops')
    .post(authorize('ADMIN', 'MANAGER', 'SUPPLY_COORDINATOR'), addRouteStop);

/**
 * @swagger
 * /api/delivery-routes/{id}/stops/{stopId}/status:
 *   put:
 *     summary: Update status of a specific stop + Upload delivery photo
 *     tags: [Delivery Routes]
 *     description: |
 *       Cập nhật status của điểm giao hàng.
 *       
 *       Status Flow: PENDING → ARRIVED → COMPLETED (→ SKIPPED)
 *       
 *       Khi status=COMPLETED, có thể upload ảnh chứng minh giao hàng.
 *       Ảnh sẽ tự động upload lên Cloudinary.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "Route ID"
 *       - in: path
 *         name: stopId
 *         required: true
 *         schema:
 *           type: string
 *         description: "Stop ID"
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
 *                 enum: ["PENDING", "ARRIVED", "COMPLETED", "SKIPPED"]
 *                 description: "Status của điểm giao hàng"
 *                 example: "COMPLETED"
 *               delivery_photo:
 *                 type: string
 *                 format: binary
 *                 description: "Ảnh chứng minh giao hàng (khi status=COMPLETED, tùy chọn)"
 *     responses:
 *       200:
 *         description: Stop status updated successfully
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
 *                     status:
 *                       type: string
 *                       example: "COMPLETED"
 *                     actual_arrival:
 *                       type: string
 *                       format: date-time
 *                     actual_departure:
 *                       type: string
 *                       format: date-time
 *                     delivery_photo_url:
 *                       type: string
 *                       description: "URL ảnh từ Cloudinary (nếu upload)"
 *                     delivery_photo_uploaded_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad request - Invalid status or missing delivery_photo
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Route or Stop not found
 *       413:
 *         description: Payload too large - File quá lớn (max 5MB)
 */
router.route('/:id/stops/:stopId/status')
    .put(authorize('ADMIN', 'MANAGER', 'SUPPLY_COORDINATOR'), upload.single('delivery_photo'), updateStopStatus);

module.exports = router;
