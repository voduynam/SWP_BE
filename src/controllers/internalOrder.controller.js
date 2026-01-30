const asyncHandler = require('../utils/asyncHandler');
const InternalOrder = require('../models/InternalOrder');
const InternalOrderLine = require('../models/InternalOrderLine');
const OrderFulfillment = require('../models/OrderFulfillment');
const ApiResponse = require('../utils/ApiResponse');

// @desc    Get all internal orders
// @route   GET /api/internal-orders
// @access  Private
exports.getInternalOrders = asyncHandler(async (req, res) => {
  const { status, store_org_unit_id, start_date, end_date } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = {};
  if (status) filter.status = status;
  if (store_org_unit_id) filter.store_org_unit_id = store_org_unit_id;

  // Filter by user's org unit if not admin/manager
  if (!req.user.roles.includes('ADMIN') && !req.user.roles.includes('MANAGER')) {
    filter.store_org_unit_id = req.user.org_unit_id;
  }

  if (start_date || end_date) {
    filter.order_date = {};
    if (start_date) filter.order_date.$gte = new Date(start_date);
    if (end_date) filter.order_date.$lte = new Date(end_date);
  }

  const orders = await InternalOrder.find(filter)
    .populate('store_org_unit_id', 'name code type')
    .populate('created_by', 'username full_name')
    .skip(skip)
    .limit(limit)
    .sort({ order_date: -1 });

  const total = await InternalOrder.countDocuments(filter);

  return res.status(200).json(
    ApiResponse.paginate(orders, page, limit, total)
  );
});

// @desc    Get single internal order with lines
// @route   GET /api/internal-orders/:id
// @access  Private
exports.getInternalOrder = asyncHandler(async (req, res) => {
  const order = await InternalOrder.findById(req.params.id)
    .populate('store_org_unit_id', 'name code type')
    .populate('created_by', 'username full_name');

  if (!order) {
    return res.status(404).json(
      ApiResponse.error('Order not found', 404)
    );
  }

  // Check access - store staff can only see their own orders
  if (!req.user.roles.includes('ADMIN') && !req.user.roles.includes('MANAGER')) {
    if (order.store_org_unit_id._id !== req.user.org_unit_id) {
      return res.status(403).json(
        ApiResponse.error('Access denied', 403)
      );
    }
  }

  const orderLines = await InternalOrderLine.find({ order_id: order._id })
    .populate('item_id', 'sku name item_type')
    .populate('uom_id', 'code name');

  // Get fulfillment status for each line
  const linesWithFulfillment = await Promise.all(
    orderLines.map(async (line) => {
      const fulfillment = await OrderFulfillment.findOne({ order_line_id: line._id });
      return {
        ...line.toObject(),
        fulfillment: fulfillment || {
          qty_shipped_total: 0,
          qty_received_total: 0
        }
      };
    })
  );

  return res.status(200).json(
    ApiResponse.success({
      ...order.toObject(),
      lines: linesWithFulfillment
    })
  );
});

// @desc    Create internal order
// @route   POST /api/internal-orders
// @access  Private (Store Staff, Manager, Admin)
exports.createInternalOrder = asyncHandler(async (req, res) => {
  const { store_org_unit_id, order_date, lines, is_urgent } = req.body;

  if (!lines || lines.length === 0) {
    return res.status(400).json(
      ApiResponse.error('Order must have at least one line', 400)
    );
  }

  // Calculate total amount
  let totalAmount = 0;
  lines.forEach(line => {
    totalAmount += line.line_total || (line.qty_ordered * line.unit_price);
  });

  // Generate order number
  const orderCount = await InternalOrder.countDocuments();
  const orderNo = `SO-${String(orderCount + 1).padStart(4, '0')}`;

  // Create order
  const order = await InternalOrder.create({
    _id: `ord_${Date.now()}`,
    order_no: orderNo,
    store_org_unit_id: store_org_unit_id || req.user.org_unit_id,
    order_date: order_date || new Date(),
    status: 'DRAFT',
    created_by: req.user.id,
    total_amount: totalAmount,
    currency: 'VND',
    is_urgent: is_urgent || false
  });

  // Create order lines
  const orderLines = await Promise.all(
    lines.map(async (line, index) => {
      const orderLine = await InternalOrderLine.create({
        _id: `ord_line_${order._id}_${index}`,
        order_id: order._id,
        item_id: line.item_id,
        qty_ordered: line.qty_ordered,
        uom_id: line.uom_id,
        unit_price: line.unit_price,
        line_total: line.line_total || (line.qty_ordered * line.unit_price)
      });

      // Create fulfillment record
      const fulfillmentCount = await OrderFulfillment.countDocuments();
      await OrderFulfillment.create({
        fulfillment_id: fulfillmentCount + 1,
        order_line_id: orderLine._id,
        qty_shipped_total: 0,
        qty_received_total: 0
      });

      return orderLine;
    })
  );

  // Update order total
  const recalculatedTotal = orderLines.reduce((sum, line) => sum + line.line_total, 0);
  order.total_amount = recalculatedTotal;
  await order.save();

  const populatedOrder = await InternalOrder.findById(order._id)
    .populate('store_org_unit_id', 'name code type')
    .populate('created_by', 'username full_name');

  // --- [NOTIFICATION TRIGGER] ---
  const notificationController = require('./notification.controller');
  if (order.is_urgent) {
    await notificationController.createNotificationInternal({
      recipient_role: 'SUPPLY_COORDINATOR',
      title: 'DƠN HÀNG KHẨN CẤP!',
      message: `Cửa hàng ${populatedOrder.store_org_unit_id.name} vừa tạo một đơn hàng khẩn cấp: ${order.order_no}`,
      type: 'URGENT',
      ref_type: 'ORDER',
      ref_id: order._id
    });

    // Also notify Manager for urgent orders
    await notificationController.createNotificationInternal({
      recipient_role: 'MANAGER',
      title: 'Cảnh báo: Đơn hàng khẩn',
      message: `Đơn hàng khẩn cấp ${order.order_no} cần được xử lý ngay.`,
      type: 'URGENT',
      ref_type: 'ORDER',
      ref_id: order._id
    });
  } else {
    await notificationController.createNotificationInternal({
      recipient_role: 'SUPPLY_COORDINATOR',
      title: 'Đơn hàng mới',
      message: `Có đơn hàng mới ${order.order_no} từ ${populatedOrder.store_org_unit_id.name}`,
      type: 'INFO',
      ref_type: 'ORDER',
      ref_id: order._id
    });
  }

  return res.status(201).json(
    ApiResponse.success({
      ...populatedOrder.toObject(),
      lines: orderLines
    }, 'Order created successfully', 201)
  );
});

// @desc    Update internal order status
// @route   PUT /api/internal-orders/:id/status
// @access  Private
exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['DRAFT', 'SUBMITTED', 'APPROVED', 'PROCESSING', 'SHIPPED', 'RECEIVED', 'CANCELLED'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json(
      ApiResponse.error('Invalid status', 400)
    );
  }

  const order = await InternalOrder.findById(req.params.id);
  if (!order) {
    return res.status(404).json(
      ApiResponse.error('Order not found', 404)
    );
  }

  // Check permissions
  if (status === 'SUBMITTED' && order.status !== 'DRAFT') {
    return res.status(400).json(
      ApiResponse.error('Only DRAFT orders can be submitted', 400)
    );
  }

  order.status = status;
  order.updated_at = new Date();
  await order.save();

  const populatedOrder = await InternalOrder.findById(order._id)
    .populate('store_org_unit_id', 'name code type')
    .populate('created_by', 'username full_name');

  // --- [NOTIFICATION TRIGGER] ---
  if (status === 'SHIPPED') {
    const notificationController = require('./notification.controller');
    await notificationController.createNotificationInternal({
      recipient_role: 'STORE_STAFF',
      recipient_id: order.created_by, // Notify the specific person who created the order
      title: 'Hàng đang trên đường giao',
      message: `Đơn hàng ${order.order_no} đã được xuất kho và đang được chuyển đến bạn.`,
      type: 'SUCCESS',
      ref_type: 'ORDER',
      ref_id: order._id
    });
  }

  return res.status(200).json(
    ApiResponse.success(populatedOrder, 'Order status updated successfully')
  );
});

// @desc    Add line to internal order
// @route   POST /api/internal-orders/:id/lines
// @access  Private
exports.addOrderLine = asyncHandler(async (req, res) => {
  const order = await InternalOrder.findById(req.params.id);
  if (!order) {
    return res.status(404).json(
      ApiResponse.error('Order not found', 404)
    );
  }

  if (order.status !== 'DRAFT') {
    return res.status(400).json(
      ApiResponse.error('Can only add lines to DRAFT orders', 400)
    );
  }

  const { item_id, qty_ordered, uom_id, unit_price } = req.body;
  const line_total = qty_ordered * unit_price;

  const orderLine = await InternalOrderLine.create({
    _id: `ord_line_${order._id}_${Date.now()}`,
    order_id: order._id,
    item_id,
    qty_ordered,
    uom_id,
    unit_price,
    line_total
  });

  // Create fulfillment record
  const fulfillmentCount = await OrderFulfillment.countDocuments();
  await OrderFulfillment.create({
    fulfillment_id: fulfillmentCount + 1,
    order_line_id: orderLine._id,
    qty_shipped_total: 0,
    qty_received_total: 0
  });

  // Update order total
  order.total_amount += line_total;
  await order.save();

  const populatedLine = await InternalOrderLine.findById(orderLine._id)
    .populate('item_id', 'sku name item_type')
    .populate('uom_id', 'code name');

  return res.status(201).json(
    ApiResponse.success(populatedLine, 'Order line added successfully', 201)
  );
});
