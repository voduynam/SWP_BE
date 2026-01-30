const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { protect } = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: 9. Alerts & Notifications
 *   description: Real-time notification management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: notif_123456789
 *         recipient_role:
 *           type: string
 *           enum: [ADMIN, MANAGER, SUPPLY_COORDINATOR, CHEF, STORE_STAFF]
 *         recipient_id:
 *           type: string
 *           nullable: true
 *         title:
 *           type: string
 *         message:
 *           type: string
 *         type:
 *           type: string
 *           enum: [INFO, URGENT, SUCCESS, ERROR]
 *         ref_type:
 *           type: string
 *           enum: [ORDER, SHIPMENT, PRODUCTION, EXCEPTION, OTHER]
 *         ref_id:
 *           type: string
 *           nullable: true
 *         is_read:
 *           type: boolean
 *         created_at:
 *           type: string
 *           format: date-time
 */

// All routes require authentication
router.use(protect);

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get user notifications
 *     tags: [9. Alerts & Notifications]
 *     security:
 *       - bearerAuth: []
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
 *           default: 20
 *     responses:
 *       200:
 *         description: List of notifications
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
 *                     notifications:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Notification'
 *                     unread_count:
 *                       type: integer
 */
router.get('/', notificationController.getNotifications);

/**
 * @swagger
 * /api/notifications/read-all:
 *   put:
 *     summary: Mark all notifications as read
 *     tags: [9. Alerts & Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
router.put('/read-all', notificationController.markAllAsRead);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   put:
 *     summary: Mark a single notification as read
 *     tags: [9. Alerts & Notifications]
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
 *         description: Notification marked as read
 */
router.put('/:id/read', notificationController.markAsRead);

module.exports = router;
