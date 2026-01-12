const asyncHandler = require('../utils/asyncHandler');
const ProductionOrder = require('../models/ProductionOrder');
const ProductionOrderLine = require('../models/ProductionOrderLine');
const ProductionConsumption = require('../models/ProductionConsumption');
const ProductionOutputLot = require('../models/ProductionOutputLot');
const ApiResponse = require('../utils/ApiResponse');

// @desc    Get all production orders
// @route   GET /api/production-orders
// @access  Private
exports.getProductionOrders = asyncHandler(async (req, res) => {
  const { status, start_date, end_date } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = {};
  if (status) filter.status = status;
  if (start_date || end_date) {
    filter.planned_start = {};
    if (start_date) filter.planned_start.$gte = new Date(start_date);
    if (end_date) filter.planned_start.$lte = new Date(end_date);
  }

  const orders = await ProductionOrder.find(filter)
    .populate('created_by', 'username full_name')
    .skip(skip)
    .limit(limit)
    .sort({ planned_start: -1 });

  const total = await ProductionOrder.countDocuments(filter);

  return res.status(200).json(
    ApiResponse.paginate(orders, page, limit, total)
  );
});

// @desc    Get single production order with lines
// @route   GET /api/production-orders/:id
// @access  Private
exports.getProductionOrder = asyncHandler(async (req, res) => {
  const order = await ProductionOrder.findById(req.params.id)
    .populate('created_by', 'username full_name');

  if (!order) {
    return res.status(404).json(
      ApiResponse.error('Production order not found', 404)
    );
  }

  const orderLines = await ProductionOrderLine.find({ prod_order_id: order._id })
    .populate('item_id', 'sku name item_type')
    .populate('recipe_id', 'version status')
    .populate('uom_id', 'code name');

  // Get consumption and output for each line
  const linesWithDetails = await Promise.all(
    orderLines.map(async (line) => {
      const consumption = await ProductionConsumption.find({ prod_order_line_id: line._id })
        .populate('material_item_id', 'sku name')
        .populate('lot_id', 'lot_code mfg_date exp_date')
        .populate('uom_id', 'code name');

      const output = await ProductionOutputLot.find({ prod_order_line_id: line._id })
        .populate('lot_id', 'lot_code mfg_date exp_date')
        .populate('uom_id', 'code name');

      return {
        ...line.toObject(),
        consumption,
        output
      };
    })
  );

  return res.status(200).json(
    ApiResponse.success({
      ...order.toObject(),
      lines: linesWithDetails
    })
  );
});

// @desc    Create production order
// @route   POST /api/production-orders
// @access  Private (Chef, Manager, Admin)
exports.createProductionOrder = asyncHandler(async (req, res) => {
  const { planned_start, planned_end, lines } = req.body;

  if (!lines || lines.length === 0) {
    return res.status(400).json(
      ApiResponse.error('Production order must have at least one line', 400)
    );
  }

  // Generate production order number
  const orderCount = await ProductionOrder.countDocuments();
  const prodOrderNo = `PO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(orderCount + 1).padStart(2, '0')}`;

  // Create production order
  const order = await ProductionOrder.create({
    _id: `po_${Date.now()}`,
    prod_order_no: prodOrderNo,
    planned_start: planned_start || new Date(),
    planned_end: planned_end || new Date(),
    status: 'DRAFT',
    created_by: req.user.id
  });

  // Create production order lines
  const orderLines = await Promise.all(
    lines.map(async (line, index) => {
      return await ProductionOrderLine.create({
        _id: `po_line_${order._id}_${index}`,
        prod_order_id: order._id,
        item_id: line.item_id,
        recipe_id: line.recipe_id,
        planned_qty: line.planned_qty,
        actual_qty: 0,
        uom_id: line.uom_id
      });
    })
  );

  const populatedOrder = await ProductionOrder.findById(order._id)
    .populate('created_by', 'username full_name');

  return res.status(201).json(
    ApiResponse.success({
      ...populatedOrder.toObject(),
      lines: orderLines
    }, 'Production order created successfully', 201)
  );
});

// @desc    Update production order status
// @route   PUT /api/production-orders/:id/status
// @access  Private (Chef, Manager, Admin)
exports.updateProductionOrderStatus = asyncHandler(async (req, res) => {
  const { status, actual_start, actual_end } = req.body;
  const validStatuses = ['DRAFT', 'PLANNED', 'RELEASED', 'IN_PROGRESS', 'DONE', 'CANCELLED'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json(
      ApiResponse.error('Invalid status', 400)
    );
  }

  const order = await ProductionOrder.findById(req.params.id);
  if (!order) {
    return res.status(404).json(
      ApiResponse.error('Production order not found', 404)
    );
  }

  order.status = status;
  if (actual_start) order.actual_start = actual_start;
  if (actual_end) order.actual_end = actual_end;
  order.updated_at = new Date();
  await order.save();

  const populatedOrder = await ProductionOrder.findById(order._id)
    .populate('created_by', 'username full_name');

  return res.status(200).json(
    ApiResponse.success(populatedOrder, 'Production order status updated successfully')
  );
});

// @desc    Record production consumption
// @route   POST /api/production-orders/:id/consumption
// @access  Private (Chef, Manager, Admin)
exports.recordConsumption = asyncHandler(async (req, res) => {
  const { prod_order_line_id, material_item_id, lot_id, qty, uom_id } = req.body;

  const orderLine = await ProductionOrderLine.findById(prod_order_line_id);
  if (!orderLine) {
    return res.status(404).json(
      ApiResponse.error('Production order line not found', 404)
    );
  }

  const consumption = await ProductionConsumption.create({
    prod_order_line_id,
    material_item_id,
    lot_id,
    qty,
    uom_id
  });

  const populatedConsumption = await ProductionConsumption.findById(consumption._id)
    .populate('material_item_id', 'sku name')
    .populate('lot_id', 'lot_code mfg_date exp_date')
    .populate('uom_id', 'code name');

  return res.status(201).json(
    ApiResponse.success(populatedConsumption, 'Consumption recorded successfully', 201)
  );
});

// @desc    Record production output
// @route   POST /api/production-orders/:id/output
// @access  Private (Chef, Manager, Admin)
exports.recordOutput = asyncHandler(async (req, res) => {
  const { prod_order_line_id, lot_id, qty, uom_id } = req.body;

  const orderLine = await ProductionOrderLine.findById(prod_order_line_id);
  if (!orderLine) {
    return res.status(404).json(
      ApiResponse.error('Production order line not found', 404)
    );
  }

  const output = await ProductionOutputLot.create({
    prod_order_line_id,
    lot_id,
    qty,
    uom_id
  });

  // Update actual quantity
  orderLine.actual_qty += qty;
  await orderLine.save();

  const populatedOutput = await ProductionOutputLot.findById(output._id)
    .populate('lot_id', 'lot_code mfg_date exp_date')
    .populate('uom_id', 'code name');

  return res.status(201).json(
    ApiResponse.success(populatedOutput, 'Output recorded successfully', 201)
  );
});
