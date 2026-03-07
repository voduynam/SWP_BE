const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { protect, authorize } = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Quản lý thanh toán
 */

/**
 * @swagger
 * /api/payments/create:
 *   post:
 *     summary: Tạo thanh toán (tiền mặt hoặc chuyển khoản)
 *     tags: [Payments]
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
 *                 description: ID của đơn hàng
 *               payment_type:
 *                 type: string
 *                 enum: ['CASH', 'BANK_TRANSFER']
 *                 description: Phương thức thanh toán
 *             required:
 *               - order_id
 *               - payment_type
 *     responses:
 *       201:
 *         description: Tạo thanh toán thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       404:
 *         description: Đơn hàng không tồn tại
 */
/**
 * @swagger
 * /api/payments/webhook/payos:
 *   post:
 *     summary: Webhook từ PayOS (công khai)
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook được xử lý
 *       400:
 *         description: Signature không hợp lệ
 */
router.post('/webhook/payos', paymentController.payosWebhook);

/**
 * @swagger
 * /api/payments/callback:
 *   get:
 *     summary: PayOS return URL callback (khi khách hàng thanh toán xong)
 *     tags: [Payments]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Mã lỗi (00 = success)
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         description: Transaction ID từ PayOS
 *       - in: query
 *         name: cancel
 *         schema:
 *           type: string
 *         description: Có phải cancel không (true/false)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Trạng thái thanh toán
 *       - in: query
 *         name: orderCode
 *         schema:
 *           type: string
 *         description: Mã đơn hàng PayOS
 *     responses:
 *       302:
 *         description: Redirect đến frontend success/error page
 */
router.get('/callback', paymentController.paymentCallback);

router.post('/create', protect, paymentController.createPayment);

/**
 * @swagger
 * /api/payments/{payment_id}:
 *   get:
 *     summary: Lấy thông tin thanh toán
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: payment_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lấy thông tin thành công
 *       404:
 *         description: Thanh toán không tồn tại
 */
router.get('/:payment_id', protect, paymentController.getPaymentById);

/**
 * @swagger
 * /api/payments/order/{order_id}:
 *   get:
 *     summary: Lấy danh sách thanh toán theo đơn hàng
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: order_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 */
router.get('/order/:order_id', protect, paymentController.getPaymentsByOrder);

/**
 * @swagger
 * /api/payments/{payment_id}/status:
 *   get:
 *     summary: Check trạng thái thanh toán
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: payment_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lấy trạng thái thành công
 *       404:
 *         description: Thanh toán không tồn tại
 */
router.get('/:payment_id/status', protect, paymentController.checkPaymentStatus);

/**
 * @swagger
 * /api/payments/{payment_id}/cancel:
 *   put:
 *     summary: Hủy thanh toán
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: payment_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Hủy thanh toán thành công
 *       400:
 *         description: Không thể hủy
 *       404:
 *         description: Thanh toán không tồn tại
 */
router.put('/:payment_id/cancel', protect, paymentController.cancelPayment);

/**
 * @swagger
 * /api/payments:
 *   get:
 *     summary: Lấy danh sách tất cả thanh toán (Admin)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED']
 *       - in: query
 *         name: payment_type
 *         schema:
 *           type: string
 *           enum: ['CASH', 'BANK_TRANSFER']
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 */
router.get(
  '/',
  protect,
  authorize('ADMIN', 'MANAGER'),
  paymentController.getAllPayments
);

module.exports = router;
