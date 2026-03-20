const asyncHandler = require('../utils/asyncHandler');
const ProductionOrder = require('../models/ProductionOrder');
const ProductionOrderLine = require('../models/ProductionOrderLine');
const ProductionConsumption = require('../models/ProductionConsumption');
const ProductionOutputLot = require('../models/ProductionOutputLot');
const ApiResponse = require('../utils/ApiResponse');

/**
 * Backfill production output into InventoryBalance so FE inventory/lots pages show correct quantities.
 * Idempotent: uses InventoryTransaction.ref_id = ProductionOutputLot._id.
 */
async function syncProductionOutputsToInventory({ prodOrderId, orgUnitId, createdByUserId }) {
  const InventoryBalance = require('../models/InventoryBalance');
  const InventoryTransaction = require('../models/InventoryTransaction');
  const Location = require('../models/Location');

  const orderLines = await ProductionOrderLine.find({ prod_order_id: prodOrderId }).select('_id item_id');
  if (!orderLines.length) return;

  const lineIds = orderLines.map(l => l._id);
  const lineIdToItemId = new Map(orderLines.map(l => [String(l._id), l.item_id]));

  const outputs = await ProductionOutputLot.find({ prod_order_line_id: { $in: lineIds } }).select('_id prod_order_line_id lot_id qty uom_id');
  if (!outputs.length) return;

  let finishedLocation = null;
  if (orgUnitId) {
    finishedLocation = await Location.findOne({
      org_unit_id: orgUnitId,
      $or: [
        { code: { $regex: 'FINISH', $options: 'i' } },
        { name: { $regex: 'FINISH', $options: 'i' } },
        { code: { $regex: 'THANH', $options: 'i' } },
        { name: { $regex: 'THANH', $options: 'i' } },
        { name: { $regex: 'PHAM', $options: 'i' } }
      ]
    });
  }

  if (!finishedLocation) {
    finishedLocation = await Location.findOne({
      $or: [
        { code: { $regex: 'FINISH', $options: 'i' } },
        { name: { $regex: 'FINISH', $options: 'i' } },
        { code: { $regex: 'THANH', $options: 'i' } },
        { name: { $regex: 'THANH', $options: 'i' } },
        { name: { $regex: 'PHAM', $options: 'i' } }
      ]
    });
  }

  // If we cannot find a finished-location, skip backfill to avoid breaking reads.
  if (!finishedLocation) return;

  for (const out of outputs) {
    const exists = await InventoryTransaction.exists({
      txn_type: 'PRODUCTION_IN',
      ref_type: 'PRODUCTION_ORDER',
      ref_id: out._id
    });
    if (exists) continue;

    const itemId = lineIdToItemId.get(String(out.prod_order_line_id));
    if (!itemId) continue;

    const qtyNum = Number(out.qty) || 0;
    if (qtyNum === 0) continue;

    const balanceFilter = {
      location_id: finishedLocation._id,
      item_id: itemId,
      lot_id: out.lot_id || null
    };

    let balance = await InventoryBalance.findOne(balanceFilter);
    if (!balance) {
      balance = await InventoryBalance.create({
        location_id: finishedLocation._id,
        item_id: itemId,
        lot_id: out.lot_id || null,
        qty_on_hand: 0,
        qty_reserved: 0
      });
    }

    balance.qty_on_hand += qtyNum;
    balance.updated_at = new Date();
    await balance.save();

    await InventoryTransaction.create({
      txn_time: new Date(),
      location_id: finishedLocation._id,
      item_id: itemId,
      lot_id: out.lot_id || null,
      qty: qtyNum,
      uom_id: out.uom_id,
      txn_type: 'PRODUCTION_IN',
      ref_type: 'PRODUCTION_ORDER',
      ref_id: out._id,
      created_by: createdByUserId,
      notes: `Backfill: production output (${prodOrderId})`
    });
  }
}

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
    .populate('created_by', 'username full_name org_unit_id');

  if (!order) {
    return res.status(404).json(
      ApiResponse.error('Production order not found', 404)
    );
  }

  // Backfill inventory for existing outputs (older data may not have been written to InventoryBalance).
  // Triggered when user opens the production order detail in FE.
  const orgUnitId = order.created_by?.org_unit_id?._id ?? order.created_by?.org_unit_id ?? null;
  try {
    await syncProductionOutputsToInventory({
      prodOrderId: order._id,
      orgUnitId,
      createdByUserId: req.user.id
    });
  } catch (_) {
    // Avoid breaking reads if backfill fails for any reason.
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

  // Validate recipes are ACTIVE
  const Recipe = require('../models/Recipe');
  for (const line of lines) {
    const recipe = await Recipe.findById(line.recipe_id);
    if (!recipe || recipe.status !== 'ACTIVE') {
      return res.status(400).json(
        ApiResponse.error(`Recipe ${line.recipe_id} is not active or not found`, 400)
      );
    }
  }

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

  // --- [BACKFLUSHING LOGIC] ---
  const InventoryBalance = require('../models/InventoryBalance');
  const InventoryTransaction = require('../models/InventoryTransaction');
  const ProductionOrder = require('../models/ProductionOrder');
  const Location = require('../models/Location');

  // Find the production order to get the location (Standard: Central Kitchen Raw Material WH)
  const orderLineWithOrder = await ProductionOrderLine.findById(prod_order_line_id).populate('prod_order_id');

  // For Central Kitchen, we usually use the RAW MATERIAL location of the CK
  // Logic: Find location of type 'WH_RAW' for the CK org unit
  const orgUnitId = orderLineWithOrder.prod_order_id.created_by.org_unit_id; // Or a fixed CK Org Unit
  const rawLocation = await Location.findOne({
    org_unit_id: orderLineWithOrder.prod_order_id.created_by.org_unit_id,
    code: /RAW/i
  }) || await Location.findOne({ code: /RAW/i });

  if (rawLocation) {
    // Update inventory balance
    const balanceFilter = {
      location_id: rawLocation._id,
      item_id: material_item_id,
      lot_id: lot_id || null
    };

    let balance = await InventoryBalance.findOne(balanceFilter);
    if (balance) {
      balance.qty_on_hand -= qty;
      balance.updated_at = new Date();
      await balance.save();

      // Record transaction
      await InventoryTransaction.create({
        txn_time: new Date(),
        location_id: rawLocation._id,
        item_id: material_item_id,
        lot_id: lot_id || null,
        qty: -qty, // Negative for consumption
        uom_id,
        txn_type: 'CONSUMPTION',
        ref_type: 'PRODUCTION_ORDER',
        ref_id: orderLineWithOrder.prod_order_id._id,
        created_by: req.user.id,
        notes: `Auto-deduct from Production consumption of ${orderLineWithOrder.prod_order_id.prod_order_no}`
      });
    }
  }

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
    qty: Number(qty) || 0,
    uom_id
  });

  // Update inventory for finished goods (add qty to InventoryBalance + transaction)
  // FE "Tồn kho bếp trung tâm" and "Nguyên liệu & lô sản xuất" rely on InventoryBalance by lot_id.
  const InventoryBalance = require('../models/InventoryBalance');
  const InventoryTransaction = require('../models/InventoryTransaction');
  const Location = require('../models/Location');

  // Try to scope to the production order's org unit; fallback to any matching finished location.
  const orderLineWithOrder = await ProductionOrderLine.findById(prod_order_line_id).populate({
    path: 'prod_order_id',
    populate: { path: 'created_by', select: 'org_unit_id' }
  });

  const orgUnitId =
    orderLineWithOrder?.prod_order_id?.created_by?.org_unit_id?._id ??
    orderLineWithOrder?.prod_order_id?.created_by?.org_unit_id ??
    null;

  const qtyNum = Number(qty) || 0;

  let finishedLocation = null;
  if (orgUnitId) {
    finishedLocation = await Location.findOne({
      org_unit_id: orgUnitId,
      $or: [
        { code: { $regex: 'FINISH', $options: 'i' } },
        { name: { $regex: 'FINISH', $options: 'i' } },
        { code: { $regex: 'THANH', $options: 'i' } },
        { name: { $regex: 'THANH', $options: 'i' } },
        { name: { $regex: 'PHAM', $options: 'i' } },
        { name: { $regex: 'THÀNH', $options: 'i' } }
      ]
    });
  }

  if (!finishedLocation) {
    finishedLocation = await Location.findOne({
      $or: [
        { code: { $regex: 'FINISH', $options: 'i' } },
        { name: { $regex: 'FINISH', $options: 'i' } },
        { code: { $regex: 'THANH', $options: 'i' } },
        { name: { $regex: 'THANH', $options: 'i' } },
        { name: { $regex: 'PHAM', $options: 'i' } },
        { name: { $regex: 'THÀNH', $options: 'i' } }
      ]
    });
  }

  if (finishedLocation && qtyNum !== 0) {
    const balanceFilter = {
      location_id: finishedLocation._id,
      item_id: orderLine.item_id,
      lot_id: lot_id || null
    };

    let balance = await InventoryBalance.findOne(balanceFilter);
    if (!balance) {
      balance = await InventoryBalance.create({
        location_id: finishedLocation._id,
        item_id: orderLine.item_id,
        lot_id: lot_id || null,
        qty_on_hand: 0,
        qty_reserved: 0
      });
    }

    balance.qty_on_hand += qtyNum;
    balance.updated_at = new Date();
    await balance.save();

    await InventoryTransaction.create({
      txn_time: new Date(),
      location_id: finishedLocation._id,
      item_id: orderLine.item_id,
      lot_id: lot_id || null,
      qty: qtyNum,
      uom_id,
      txn_type: 'PRODUCTION_IN',
      ref_type: 'PRODUCTION_ORDER',
      // Use the created ProductionOutputLot id for idempotency when backfilling.
      ref_id: output._id,
      created_by: req.user.id,
      notes: `Auto-receipt from production output (${orderLineWithOrder?.prod_order_id?.prod_order_no || orderLineWithOrder?.prod_order_id?._id || 'PO'})`
    });
  }

  // Update actual quantity
  orderLine.actual_qty += qtyNum;
  await orderLine.save();

  const populatedOutput = await ProductionOutputLot.findById(output._id)
    .populate('lot_id', 'lot_code mfg_date exp_date')
    .populate('uom_id', 'code name');

  return res.status(201).json(
    ApiResponse.success(populatedOutput, 'Output recorded successfully', 201)
  );
});
