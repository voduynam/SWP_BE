const express = require('express');
const router = express.Router();
const {
    getExceptions,
    getException,
    createException,
    updateException,
    resolveException,
    getExceptionSummary
} = require('../controllers/exception.controller');
const { protect, authorize } = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Exceptions
 *   description: Exception reporting and management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Exception:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         exception_type:
 *           type: string
 *           enum: [SHORTAGE, DAMAGE, WRONG_ITEM, LATE_DELIVERY, OTHER]
 *         severity:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *         order_id:
 *           type: string
 *           nullable: true
 *         item_id:
 *           type: string
 *           nullable: true
 *         store_org_unit_id:
 *           type: string
 *         description:
 *           type: string
 *         status:
 *           type: string
 *           enum: [OPEN, INVESTIGATING, RESOLVED, CLOSED]
 *         reported_by:
 *           type: string
 *         reported_at:
 *           type: string
 *           format: date-time
 */

// All routes require authentication
router.use(protect);

/**
 * @swagger
 * /api/exceptions/summary:
 *   get:
 *     summary: Get exception summary
 *     tags: [Exceptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Exception summary data
 */
router.route('/summary')
    .get(authorize('ADMIN', 'MANAGER', 'SUPPLY_COORDINATOR'), getExceptionSummary);

/**
 * @swagger
 * /api/exceptions:
 *   get:
 *     summary: Get all exceptions
 *     tags: [Exceptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of exceptions
 *   post:
 *     summary: Create exception
 *     tags: [Exceptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               exception_type:
 *                 type: string
 *                 enum: [SHORTAGE, DAMAGE, WRONG_ITEM, LATE_DELIVERY, OTHER]
 *               severity:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *               description:
 *                 type: string
 *               store_org_unit_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Exception created
 */
router.route('/')
    .get(getExceptions)
    .post(createException);

/**
 * @swagger
 * /api/exceptions/{id}:
 *   get:
 *     summary: Get single exception
 *     tags: [Exceptions]
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
 *         description: Exception details
 *   put:
 *     summary: Update exception
 *     tags: [Exceptions]
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
 *             $ref: '#/components/schemas/Exception'
 *     responses:
 *       200:
 *         description: Exception updated
 */
router.route('/:id')
    .get(getException)
    .put(authorize('ADMIN', 'MANAGER', 'SUPPLY_COORDINATOR'), updateException);

/**
 * @swagger
 * /api/exceptions/{id}/resolve:
 *   put:
 *     summary: Resolve exception
 *     tags: [Exceptions]
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
 *               resolution:
 *                 type: string
 *     responses:
 *       200:
 *         description: Exception resolved
 */
router.route('/:id/resolve')
    .put(authorize('ADMIN', 'MANAGER', 'SUPPLY_COORDINATOR'), resolveException);

module.exports = router;
