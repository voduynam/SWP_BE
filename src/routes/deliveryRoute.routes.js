const express = require('express');
const router = express.Router();
const {
    getDeliveryRoutes,
    getDeliveryRoute,
    createDeliveryRoute,
    updateDeliveryRoute,
    updateRouteStatus,
    addRouteStop,
    updateStopStatus
} = require('../controllers/deliveryRoute.controller');
const { protect, authorize } = require('../middlewares/auth');

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
 *             properties:
 *               route_name:
 *                 type: string
 *               driver_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Route created
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
 *     summary: Update status of a specific stop
 *     tags: [Delivery Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: stopId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Stop status updated
 */
router.route('/:id/stops/:stopId/status')
    .put(authorize('ADMIN', 'MANAGER', 'SUPPLY_COORDINATOR'), updateStopStatus);

module.exports = router;
