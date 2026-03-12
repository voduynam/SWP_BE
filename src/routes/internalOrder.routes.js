const express = require('express');
const router = express.Router();
const internalOrderController = require('../controllers/internalOrder.controller');
const { protect, authorize } = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Internal Orders
 *   description: Store-to-Kitchen internal order management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     InternalOrder:
 *       type: object
 *       required:
 *         - lines
 *       properties:
 *         _id:
 *           type: string
 *           description: Order unique identifier
 *           example: "ord_1710241234567"
 *         order_no:
 *           type: string
 *           description: Order number (auto-generated SO-XXXX)
 *           example: "SO-0001"
 *         store_org_unit_id:
 *           type: string
 *           description: Store/Organization Unit ID
 *           example: "store_001"
 *         order_date:
 *           type: string
 *           format: date-time
 *           description: Order creation date
 *           example: "2026-03-12T10:30:00Z"
 *         status:
 *           type: string
 *           enum: [DRAFT, SUBMITTED, APPROVED, PROCESSING, SHIPPED, RECEIVED, CANCELLED]
 *           description: Order status
 *           example: "DRAFT"
 *         total_amount:
 *           type: number
 *           description: Total order amount (VND)
 *           example: 750000
 *         currency:
 *           type: string
 *           description: Currency
 *           example: "VND"
 *         is_urgent:
 *           type: boolean
 *           description: Is this an urgent order?
 *           example: false
 *         created_by:
 *           type: string
 *           description: User ID who created the order
 *           example: "user_123"
 *       example:
 *         _id: "ord_1710241234567"
 *         order_no: "SO-0001"
 *         store_org_unit_id: "store_001"
 *         order_date: "2026-03-12T10:30:00Z"
 *         status: "DRAFT"
 *         total_amount: 750000
 *         currency: "VND"
 *         is_urgent: false
 *         created_by: "user_123"
 *
 *     InternalOrderLine:
 *       type: object
 *       required:
 *         - item_id
 *         - qty_ordered
 *         - uom_id
 *       properties:
 *         _id:
 *           type: string
 *           description: Order line unique identifier
 *           example: "ord_line_1710241234567_0"
 *         order_id:
 *           type: string
 *           description: Parent order ID
 *           example: "ord_1710241234567"
 *         item_id:
 *           type: string
 *           description: Item/Product ID (required)
 *           example: "item_001"
 *         qty_ordered:
 *           type: number
 *           description: Quantity ordered
 *           example: 10
 *         uom_id:
 *           type: string
 *           description: Unit of Measure ID
 *           example: "uom_kg"
 *         unit_price:
 *           type: number
 *           description: Unit price (auto-fetched from Item.base_sell_price if not provided)
 *           example: 75000
 *         line_total:
 *           type: number
 *           description: Line total (qty_ordered × unit_price)
 *           example: 750000
 *       example:
 *         _id: "ord_line_1710241234567_0"
 *         order_id: "ord_1710241234567"
 *         item_id: "item_001"
 *         qty_ordered: 10
 *         uom_id: "uom_kg"
 *         unit_price: 75000
 *         line_total: 750000
 */

// All routes require authentication
router.use(protect);

/**
 * @swagger
 * /api/internal-orders:
 *   get:
 *     summary: Get all internal orders
 *     tags: [Internal Orders]
 *     description: |
 *       Get list of internal orders with role-based filtering:
 *       
 *       - **ADMIN/MANAGER/CHEF**: View all orders from all stores
 *       - **STORE_STAFF**: View only orders from their own store
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by order status (DRAFT, SUBMITTED, APPROVED, etc.)
 *       - in: query
 *         name: store_org_unit_id
 *         schema:
 *           type: string
 *         description: Filter by store ID (only admins can override)
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *     responses:
 *       200:
 *         description: List of internal orders
 */
router.get('/', internalOrderController.getInternalOrders);

/**
 * @swagger
 * /api/internal-orders/{id}:
 *   get:
 *     summary: Get single internal order with lines
 *     tags: [Internal Orders]
 *     description: |
 *       Get detailed information for a single order including line items.
 *       
 *       **Access Control:**
 *       - **ADMIN/MANAGER/CHEF**: Can view any order
 *       - **STORE_STAFF**: Can only view orders from their own store
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order details with lines
 *       403:
 *         description: Access denied - not authorized to view this order
 *       404:
 *         description: Order not found
 */
router.get('/:id', internalOrderController.getInternalOrder);

/**
 * @swagger
 * /api/internal-orders/{id}/history:
 *   get:
 *     summary: Get complete order history (Order → Shipment → Delivery)
 *     tags: [Internal Orders]
 *     description: |
 *       Xem lịch sử đầy đủ của đơn hàng từ lúc tạo cho đến khi giao.
 *       
 *       Bao gồm:
 *       - Chi tiết đơn hàng và các mặt hàng
 *       - Danh sách shipments (trạng thái, ảnh giao hàng)
 *       - Thông tin delivery route (tài xế, xe, trạng thái)
 *       - Tổng hợp trạng thái giao hàng
 *       
 *       **Access Control:**
 *       - **ADMIN/MANAGER/CHEF**: Can view any order history
 *       - **STORE_STAFF**: Can only view history for their own store orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: "Order ID"
 *     responses:
 *       200:
 *         description: Complete order history with shipment and delivery details
 *       403:
 *         description: Access denied - not authorized to view this order
 *       404:
 *         description: Order not found
 */
router.get('/:id/history', internalOrderController.getOrderHistory);

/**
 * @swagger
 * /api/internal-orders:
 *   post:
 *     summary: Create internal order
 *     tags: [Internal Orders]
 *     description: |
 *       **NEW:** unit_price is now optional! 
 *       
 *       - If `unit_price` is NOT provided → Auto-fetch from Item's `base_sell_price`
 *       - If `unit_price` IS provided → Use the provided value (override)
 *       - Item must have a `base_sell_price` > 0, otherwise error
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lines
 *             properties:
 *               store_org_unit_id:
 *                 type: string
 *                 description: Store ID (optional, defaults to current user's organization)
 *                 example: "store_001"
 *               order_date:
 *                 type: string
 *                 format: date-time
 *                 description: Order date (optional, defaults to now)
 *                 example: "2026-03-12T10:30:00Z"
 *               lines:
 *                 type: array
 *                 description: Order lines
 *                 items:
 *                   type: object
 *                   required:
 *                     - item_id
 *                     - qty_ordered
 *                     - uom_id
 *                   properties:
 *                     item_id:
 *                       type: string
 *                       example: "item_001"
 *                     qty_ordered:
 *                       type: number
 *                       example: 10
 *                     uom_id:
 *                       type: string
 *                       example: "uom_kg"
 *                     unit_price:
 *                       type: number
 *                       description: "(OPTIONAL) If not provided, auto-fetches from Item.base_sell_price"
 *                       example: 75000
 *               is_urgent:
 *                 type: boolean
 *                 description: Is this urgent?
 *                 example: false
 *           examples:
 *             withoutPrice:
 *               summary: "✅ RECOMMENDED: Auto-fetch price from Item"
 *               value:
 *                 lines:
 *                   - item_id: "item_001"
 *                     qty_ordered: 10
 *                     uom_id: "uom_kg"
 *                 is_urgent: false
 *             withPrice:
 *               summary: "Override price (if needed)"
 *               value:
 *                 lines:
 *                   - item_id: "item_001"
 *                     qty_ordered: 10
 *                     uom_id: "uom_kg"
 *                     unit_price: 85000
 *                 is_urgent: false
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: "Error: Item has no price / Item not found, etc."
 */
router.post('/', authorize('STORE_STAFF', 'MANAGER', 'ADMIN'), internalOrderController.createInternalOrder);

/**
 * @swagger
 * /api/internal-orders/{id}/status:
 *   put:
 *     summary: Update internal order status
 *     tags: [Internal Orders]
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
 *                 enum: [DRAFT, SUBMITTED, APPROVED, PROCESSING, SHIPPED, RECEIVED, CANCELLED]
 *     responses:
 *       200:
 *         description: Status updated
 */
router.put('/:id/status', internalOrderController.updateOrderStatus);

/**
 * @swagger
 * /api/internal-orders/{id}/lines:
 *   post:
 *     summary: Add line to internal order (DRAFT only)
 *     tags: [Internal Orders]
 *     description: |
 *       Add a new line to an existing DRAFT order.
 *       
 *       **Price handling (same as create order):**
 *       - If `unit_price` is NOT provided → Auto-fetch from Item's `base_sell_price`
 *       - If `unit_price` IS provided → Use the provided value (override)
 *       - Order must be in DRAFT status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - item_id
 *               - qty_ordered
 *               - uom_id
 *             properties:
 *               item_id:
 *                 type: string
 *                 description: Item/Product ID
 *                 example: "item_002"
 *               qty_ordered:
 *                 type: number
 *                 description: Quantity to order
 *                 example: 5
 *               uom_id:
 *                 type: string
 *                 description: Unit of Measure ID
 *                 example: "uom_kg"
 *               unit_price:
 *                 type: number
 *                 description: "(OPTIONAL) If not provided, auto-fetches from Item.base_sell_price"
 *                 example: 75000
 *           examples:
 *             autoPrice:
 *               summary: "✅ RECOMMENDED: Auto-fetch price"
 *               value:
 *                 item_id: "item_002"
 *                 qty_ordered: 5
 *                 uom_id: "uom_kg"
 *             overridePrice:
 *               summary: "Override price (if needed)"
 *               value:
 *                 item_id: "item_002"
 *                 qty_ordered: 5
 *                 uom_id: "uom_kg"
 *                 unit_price: 80000
 *     responses:
 *       201:
 *         description: Line added successfully
 *       400:
 *         description: "Error: Item has no price / Order not in DRAFT status"
 *       404:
 *         description: "Error: Order not found"
 */
router.post('/:id/lines', internalOrderController.addOrderLine);

/**
 * @swagger
 * /api/internal-orders/{id}/create-production:
 *   post:
 *     summary: Create Production Order from Internal Order
 *     description: Creates a production order from an approved internal order. Automatically links the items to their active recipes.
 *     tags: [Internal Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Internal Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               planned_start:
 *                 type: string
 *                 format: date-time
 *                 description: "Planned production start date (optional, default now)"
 *                 example: "2026-03-13T08:00:00Z"
 *               planned_end:
 *                 type: string
 *                 format: date-time
 *                 description: "Planned production end date (optional, default now)"
 *                 example: "2026-03-13T16:00:00Z"
 *     responses:
 *       201:
 *         description: Production order created successfully
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
 *                       example: "po_1710241234567"
 *                     prod_order_no:
 *                       type: string
 *                       example: "PO-202603-01"
 *                     internal_order_id:
 *                       type: string
 *                       example: "ord_1710241234567"
 *                     status:
 *                       type: string
 *                       example: "PLANNED"
 *                     lines:
 *                       type: array
 *       400:
 *         description: "Error: Invalid order status / No active recipe for item / Order has no lines"
 *       404:
 *         description: "Error: Internal order not found"
 */
router.post('/:id/create-production', authorize('CHEF', 'MANAGER', 'ADMIN'), internalOrderController.createProductionFromOrder);

module.exports = router;
