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

  // --- [PERFORMANCE TRACKING] ---
  // When production order is completed, check for performance issues
  if (status === 'DONE') {
    const PerformanceService = require('../services/performanceService');
    
    // Get production lines to check for shortages
    const ProductionOrderLine = require('../models/ProductionOrderLine');
    const productionLines = await ProductionOrderLine.find({ prod_order_id: order._id });
    
    // Check for production shortage
    await PerformanceService.detectProductionShortage(order, productionLines);
    
    // Check for quality issues (waste transactions)
    const WasteTransaction = require('../models/WasteTransaction');
    const wasteTransactions = await WasteTransaction.find({
      ref_type: 'PRODUCTION_ORDER',
      ref_id: order._id,
      waste_category: 'PRODUCTION_WASTE'
    });
    
    if (wasteTransactions.length > 0) {
      await PerformanceService.detectProductionQuality(order, wasteTransactions);
    }
  }

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
// @desc    Handle production shortage - create compensating production order
// @route   POST /api/production-orders/:id/compensate
// @access  Private (Chef, Manager, Admin)
exports.compensateProductionShortage = asyncHandler(async (req, res) => {
  const { shortage_items, reason, priority } = req.body;

  if (!shortage_items || shortage_items.length === 0) {
    return res.status(400).json(
      ApiResponse.error('Shortage items are required', 400)
    );
  }

  const originalOrder = await ProductionOrder.findById(req.params.id)
    .populate('created_by', 'username full_name org_unit_id');

  if (!originalOrder) {
    return res.status(404).json(
      ApiResponse.error('Original production order not found', 404)
    );
  }

  // Generate compensating production order number
  const orderCount = await ProductionOrder.countDocuments();
  const compOrderNo = `PO-COMP-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(orderCount + 1).padStart(2, '0')}`;

  // Check material availability and calculate costs
  const Recipe = require('../models/Recipe');
  const RecipeLine = require('../models/RecipeLine');
  const InventoryBalance = require('../models/InventoryBalance');
  const Location = require('../models/Location');
  const Item = require('../models/Item');
  
  let totalCompensationCost = 0;
  const materialRequirements = [];
  const insufficientMaterials = [];

  // Get kitchen raw material location
  const orgUnitId = originalOrder.created_by?.org_unit_id?._id || originalOrder.created_by?.org_unit_id;
  const rawLocation = await Location.findOne({
    org_unit_id: orgUnitId,
    $or: [
      { code: { $regex: 'RAW', $options: 'i' } },
      { name: { $regex: 'RAW', $options: 'i' } },
      { name: { $regex: 'NGUYÊN', $options: 'i' } }
    ]
  }) || await Location.findOne({
    $or: [
      { code: { $regex: 'RAW', $options: 'i' } },
      { name: { $regex: 'RAW', $options: 'i' } }
    ]
  });

  if (!rawLocation) {
    return res.status(400).json(
      ApiResponse.error('Raw material location not found', 400)
    );
  }

  // Create compensating production order
  const compensatingOrder = await ProductionOrder.create({
    _id: `po_comp_${Date.now()}`,
    prod_order_no: compOrderNo,
    planned_start: new Date(),
    planned_end: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    status: priority === 'URGENT' ? 'RELEASED' : 'PLANNED',
    created_by: req.user.id,
    compensating_for_order_id: originalOrder._id,
    is_compensating_order: true
  });

  // Create compensating production order lines and check materials
  const compensatingLines = await Promise.all(
    shortage_items.map(async (item, index) => {
      // Get the original line to copy recipe and other details
      const originalLine = await ProductionOrderLine.findOne({
        prod_order_id: originalOrder._id,
        item_id: item.item_id
      });

      if (!originalLine) {
        throw new Error(`Original production line not found for item ${item.item_id}`);
      }

      // Verify recipe is still active
      const recipe = await Recipe.findById(originalLine.recipe_id);
      if (!recipe || recipe.status !== 'ACTIVE') {
        throw new Error(`Recipe ${originalLine.recipe_id} is not active`);
      }

      // Get recipe lines to check material requirements
      const recipeLines = await RecipeLine.find({ recipe_id: recipe._id })
        .populate('material_item_id', 'sku name cost_price')
        .populate('uom_id', 'code name');

      // Calculate material requirements for this shortage quantity
      for (const recipeLine of recipeLines) {
        const requiredQty = (recipeLine.qty_per_batch || 0) * item.shortage_qty;
        const materialCost = (recipeLine.material_item_id?.cost_price || 0) * requiredQty;
        totalCompensationCost += materialCost;

        // Check current inventory
        const currentStock = await InventoryBalance.findOne({
          location_id: rawLocation._id,
          item_id: recipeLine.material_item_id._id
        });

        const availableQty = currentStock?.qty_on_hand || 0;
        
        materialRequirements.push({
          material_item_id: recipeLine.material_item_id._id,
          material_name: recipeLine.material_item_id.name,
          required_qty: requiredQty,
          available_qty: availableQty,
          unit_cost: recipeLine.material_item_id?.cost_price || 0,
          total_cost: materialCost,
          uom_id: recipeLine.uom_id._id,
          is_sufficient: availableQty >= requiredQty
        });

        // Track insufficient materials
        if (availableQty < requiredQty) {
          insufficientMaterials.push({
            material_item_id: recipeLine.material_item_id._id,
            material_name: recipeLine.material_item_id.name,
            required_qty: requiredQty,
            available_qty: availableQty,
            shortage_qty: requiredQty - availableQty,
            unit_cost: recipeLine.material_item_id?.cost_price || 0,
            uom_id: recipeLine.uom_id._id
          });
        }
      }

      return await ProductionOrderLine.create({
        _id: `po_comp_line_${compensatingOrder._id}_${index}`,
        prod_order_id: compensatingOrder._id,
        item_id: item.item_id,
        recipe_id: originalLine.recipe_id,
        planned_qty: item.shortage_qty,
        actual_qty: 0,
        uom_id: originalLine.uom_id
      });
    })
  );

  // Create material request if there are insufficient materials
  let materialRequestId = null;
  if (insufficientMaterials.length > 0) {
    const MaterialRequest = require('../models/MaterialRequest');
    const MaterialRequestLine = require('../models/MaterialRequestLine');
    
    const requestCount = await MaterialRequest.countDocuments();
    const requestNo = `MR-COMP-${String(requestCount + 1).padStart(4, '0')}`;

    const materialRequest = await MaterialRequest.create({
      _id: `mr_comp_${Date.now()}`,
      request_no: requestNo,
      requested_by: req.user.id,
      priority: 'URGENT',
      request_reason: 'PRODUCTION_SHORTAGE_COMPENSATION',
      production_order_id: compensatingOrder._id,
      location_id: rawLocation._id,
      notes: `Material request for compensating production order ${compOrderNo}. Original order: ${originalOrder.prod_order_no}`,
      expected_delivery: new Date(Date.now() + 12 * 60 * 60 * 1000) // 12 hours
    });

    await Promise.all(
      insufficientMaterials.map(async (material, index) => {
        return await MaterialRequestLine.create({
          _id: `mr_comp_line_${materialRequest._id}_${index}`,
          material_request_id: materialRequest._id,
          item_id: material.material_item_id,
          quantity_requested: material.shortage_qty,
          uom_id: material.uom_id,
          current_stock: material.available_qty,
          minimum_required: material.shortage_qty,
          urgency_level: 'URGENT',
          reason: `Shortage compensation for ${originalOrder.prod_order_no}`,
          estimated_cost: material.shortage_qty * material.unit_cost
        });
      })
    );

    materialRequestId = materialRequest._id;

    // Notify manager about material shortage
    try {
      const { createNotificationInternal } = require('./notification.controller');
      await createNotificationInternal({
        recipient_role: 'MANAGER',
        title: 'URGENT: Material Shortage for Production Compensation',
        message: `Compensating order ${compOrderNo} requires ${insufficientMaterials.length} materials. Material request ${requestNo} created.`,
        type: 'URGENT',
        ref_type: 'MATERIAL_REQUEST',
        ref_id: materialRequest._id
      });
    } catch (error) {
      console.error('Error creating material shortage notification:', error);
    }
  }

  // Create notifications
  try {
    const { createNotificationInternal } = require('./notification.controller');
    
    // Notify kitchen staff
    await createNotificationInternal({
      recipient_role: 'CHEF',
      title: 'Compensating Production Order Created',
      message: `Production order ${compOrderNo} created to compensate shortage from ${originalOrder.prod_order_no}. Estimated cost: ${totalCompensationCost.toLocaleString()} VND`,
      type: priority === 'URGENT' ? 'URGENT' : 'INFO',
      ref_type: 'PRODUCTION',
      ref_id: compensatingOrder._id
    });

    // Notify manager about cost impact
    await createNotificationInternal({
      recipient_role: 'MANAGER',
      title: 'Production Shortage Cost Impact',
      message: `Compensating order ${compOrderNo} will cost ${totalCompensationCost.toLocaleString()} VND. ${insufficientMaterials.length > 0 ? 'Material purchase required.' : 'Materials available.'}`,
      type: totalCompensationCost > 1000000 ? 'URGENT' : 'INFO',
      ref_type: 'PRODUCTION',
      ref_id: compensatingOrder._id
    });
  } catch (error) {
    console.error('Error creating notifications:', error);
  }

  const populatedOrder = await ProductionOrder.findById(compensatingOrder._id)
    .populate('created_by', 'username full_name');

  return res.status(201).json(
    ApiResponse.success({
      compensating_order: populatedOrder,
      lines: compensatingLines,
      original_order_id: originalOrder._id,
      cost_analysis: {
        total_compensation_cost: totalCompensationCost,
        currency: 'VND',
        material_requirements: materialRequirements,
        materials_sufficient: insufficientMaterials.length === 0
      },
      material_shortage: insufficientMaterials.length > 0 ? {
        insufficient_materials: insufficientMaterials,
        material_request_id: materialRequestId,
        total_shortage_cost: insufficientMaterials.reduce((sum, m) => sum + (m.shortage_qty * m.unit_cost), 0)
      } : null
    }, 'Compensating production order created with cost analysis', 201)
  );
});

// @desc    Check production variance and suggest compensation
// @route   GET /api/production-orders/:id/variance-check
// @access  Private (Chef, Manager, Admin)
exports.checkProductionVariance = asyncHandler(async (req, res) => {
  const productionOrder = await ProductionOrder.findById(req.params.id);
  if (!productionOrder) {
    return res.status(404).json(
      ApiResponse.error('Production order not found', 404)
    );
  }

  // Get all production lines with variance
  const orderLines = await ProductionOrderLine.find({ prod_order_id: productionOrder._id })
    .populate('item_id', 'sku name item_type cost_price')
    .populate('uom_id', 'code name');

  const varianceAnalysis = orderLines.map(line => {
    const plannedQty = line.planned_qty || 0;
    const actualQty = line.actual_qty || 0;
    const variance = actualQty - plannedQty;
    const variancePercent = plannedQty > 0 ? ((variance / plannedQty) * 100).toFixed(2) : 0;

    return {
      line_id: line._id,
      item: line.item_id || { _id: 'unknown', name: 'Unknown Item', cost_price: 0 },
      uom: line.uom_id || { _id: 'unknown', code: 'UNK' },
      planned_qty: plannedQty,
      actual_qty: actualQty,
      variance: variance,
      variance_percent: parseFloat(variancePercent),
      shortage_qty: variance < 0 ? Math.abs(variance) : 0,
      excess_qty: variance > 0 ? variance : 0,
      needs_compensation: variance < 0
    };
  });

  const shortageItems = varianceAnalysis.filter(item => item.needs_compensation);
  const totalShortageValue = shortageItems.reduce((sum, item) => {
    const itemCost = item.item?.cost_price || 0;
    return sum + (item.shortage_qty * itemCost);
  }, 0);

  return res.status(200).json(
    ApiResponse.success({
      production_order: productionOrder,
      variance_analysis: varianceAnalysis,
      summary: {
        total_lines: orderLines.length,
        lines_with_shortage: shortageItems.length,
        lines_with_excess: varianceAnalysis.filter(item => item.excess_qty > 0).length,
        total_shortage_value: totalShortageValue,
        needs_compensation: shortageItems.length > 0
      },
      shortage_items: shortageItems,
      compensation_suggestion: shortageItems.length > 0 ? {
        recommended_action: 'CREATE_COMPENSATING_ORDER',
        priority: totalShortageValue > 1000000 ? 'URGENT' : 'NORMAL', // > 1M VND
        estimated_time: '24 hours',
        items_to_produce: shortageItems.map(item => ({
          item_id: item.item?._id || 'unknown',
          shortage_qty: item.shortage_qty,
          uom_id: item.uom?._id || 'unknown'
        }))
      } : null
    })
  );
});

// @desc    Execute compensating production with automatic material consumption
// @route   POST /api/production-orders/:id/execute-compensation
// @access  Private (Chef, Manager, Admin)
exports.executeCompensatingProduction = asyncHandler(async (req, res) => {
  const compensatingOrder = await ProductionOrder.findById(req.params.id)
    .populate('created_by', 'username full_name org_unit_id');

  if (!compensatingOrder) {
    return res.status(404).json(
      ApiResponse.error('Compensating production order not found', 404)
    );
  }

  if (!compensatingOrder.is_compensating_order) {
    return res.status(400).json(
      ApiResponse.error('This is not a compensating production order', 400)
    );
  }

  if (compensatingOrder.status !== 'RELEASED') {
    return res.status(400).json(
      ApiResponse.error('Compensating order must be RELEASED to execute', 400)
    );
  }

  // Get compensating order lines
  const orderLines = await ProductionOrderLine.find({ prod_order_id: compensatingOrder._id })
    .populate('item_id', 'sku name cost_price')
    .populate('recipe_id', 'version status')
    .populate('uom_id', 'code name');

  if (!orderLines.length) {
    return res.status(400).json(
      ApiResponse.error('No production lines found', 400)
    );
  }

  // Get required models
  const Recipe = require('../models/Recipe');
  const RecipeLine = require('../models/RecipeLine');
  const InventoryBalance = require('../models/InventoryBalance');
  const InventoryTransaction = require('../models/InventoryTransaction');
  const ProductionConsumption = require('../models/ProductionConsumption');
  const Location = require('../models/Location');
  const ProductionVarianceCost = require('../models/ProductionVarianceCost');

  // Find raw material location
  const orgUnitId = compensatingOrder.created_by?.org_unit_id?._id || compensatingOrder.created_by?.org_unit_id;
  const rawLocation = await Location.findOne({
    org_unit_id: orgUnitId,
    $or: [
      { code: { $regex: 'RAW', $options: 'i' } },
      { name: { $regex: 'RAW', $options: 'i' } },
      { name: { $regex: 'NGUYÊN', $options: 'i' } }
    ]
  }) || await Location.findOne({
    $or: [
      { code: { $regex: 'RAW', $options: 'i' } },
      { name: { $regex: 'RAW', $options: 'i' } }
    ]
  });

  if (!rawLocation) {
    return res.status(400).json(
      ApiResponse.error('Raw material location not found', 400)
    );
  }

  let totalMaterialCost = 0;
  const materialCosts = [];
  const consumptionRecords = [];

  // Process each production line
  for (const line of orderLines) {
    // Get recipe lines for material consumption
    const recipeLines = await RecipeLine.find({ recipe_id: line.recipe_id._id })
      .populate('material_item_id', 'sku name cost_price')
      .populate('uom_id', 'code name');

    for (const recipeLine of recipeLines) {
      const requiredQty = (recipeLine.qty_per_batch || 0) * line.planned_qty;
      const unitCost = recipeLine.material_item_id?.cost_price || 0;
      const materialCost = requiredQty * unitCost;

      if (requiredQty > 0) {
        // Check inventory availability
        const balance = await InventoryBalance.findOne({
          location_id: rawLocation._id,
          item_id: recipeLine.material_item_id._id
        });

        if (!balance || balance.qty_on_hand < requiredQty) {
          return res.status(400).json(
            ApiResponse.error(
              `Insufficient inventory for ${recipeLine.material_item_id.name}. Required: ${requiredQty}, Available: ${balance?.qty_on_hand || 0}`,
              400
            )
          );
        }

        // Update inventory balance (consume materials)
        balance.qty_on_hand -= requiredQty;
        balance.updated_at = new Date();
        await balance.save();

        // Create inventory transaction
        await InventoryTransaction.create({
          txn_time: new Date(),
          location_id: rawLocation._id,
          item_id: recipeLine.material_item_id._id,
          qty: -requiredQty, // Negative for consumption
          uom_id: recipeLine.uom_id._id,
          txn_type: 'CONSUMPTION',
          ref_type: 'PRODUCTION_ORDER',
          ref_id: compensatingOrder._id,
          created_by: req.user.id,
          unit_cost: unitCost,
          total_value: -materialCost, // Negative for cost
          notes: `Auto-consumption for compensating production ${compensatingOrder.prod_order_no}`
        });

        // Create production consumption record
        const consumption = await ProductionConsumption.create({
          prod_order_line_id: line._id,
          material_item_id: recipeLine.material_item_id._id,
          qty: requiredQty,
          uom_id: recipeLine.uom_id._id
        });

        consumptionRecords.push(consumption);
        totalMaterialCost += materialCost;

        materialCosts.push({
          material_item_id: recipeLine.material_item_id._id,
          material_name: recipeLine.material_item_id.name,
          quantity_used: requiredQty,
          unit_cost: unitCost,
          total_cost: materialCost,
          uom_id: recipeLine.uom_id._id
        });
      }
    }
  }

  // Update compensating order status and cost
  compensatingOrder.status = 'IN_PROGRESS';
  compensatingOrder.actual_start = new Date();
  compensatingOrder.actual_material_cost = totalMaterialCost;
  compensatingOrder.updated_at = new Date();
  await compensatingOrder.save();

  // Create production variance cost record
  const originalOrder = await ProductionOrder.findById(compensatingOrder.compensating_for_order_id);
  const originalLines = await ProductionOrderLine.find({ prod_order_id: originalOrder._id });
  
  const totalPlanned = originalLines.reduce((sum, line) => sum + (line.planned_qty || 0), 0);
  const totalActual = originalLines.reduce((sum, line) => sum + (line.actual_qty || 0), 0);
  const shortageQty = Math.max(0, totalPlanned - totalActual);

  const varianceCost = await ProductionVarianceCost.create({
    _id: `pvc_${Date.now()}`,
    original_production_order_id: originalOrder._id,
    compensating_production_order_id: compensatingOrder._id,
    variance_type: 'SHORTAGE',
    planned_quantity: totalPlanned,
    actual_quantity: totalActual,
    shortage_quantity: shortageQty,
    material_costs: materialCosts,
    total_variance_cost: totalMaterialCost,
    impact_on_profit: -totalMaterialCost, // Negative impact on profit
    reason: 'Production shortage compensation',
    created_by: req.user.id,
    status: 'PENDING'
  });

  // Create notifications
  try {
    const { createNotificationInternal } = require('./notification.controller');
    
    // Notify manager about cost impact
    await createNotificationInternal({
      recipient_role: 'MANAGER',
      title: 'Production Variance Cost Incurred',
      message: `Compensating production ${compensatingOrder.prod_order_no} started. Material cost: ${totalMaterialCost.toLocaleString()} VND. Profit impact: -${totalMaterialCost.toLocaleString()} VND`,
      type: totalMaterialCost > 500000 ? 'URGENT' : 'INFO',
      ref_type: 'PRODUCTION',
      ref_id: compensatingOrder._id
    });

    // Notify chef about execution
    await createNotificationInternal({
      recipient_role: 'CHEF',
      title: 'Compensating Production Started',
      message: `Production ${compensatingOrder.prod_order_no} materials consumed. Ready for production execution.`,
      type: 'INFO',
      ref_type: 'PRODUCTION',
      ref_id: compensatingOrder._id
    });
  } catch (error) {
    console.error('Error creating notifications:', error);
  }

  return res.status(200).json(
    ApiResponse.success({
      compensating_order: compensatingOrder,
      material_consumption: {
        total_materials_consumed: consumptionRecords.length,
        total_cost: totalMaterialCost,
        currency: 'VND',
        materials: materialCosts
      },
      variance_cost_record: varianceCost,
      profit_impact: {
        amount: -totalMaterialCost,
        currency: 'VND',
        note: 'Company absorbs this cost - customer payment unchanged'
      }
    }, 'Compensating production executed with automatic material consumption', 200)
  );
});

// @desc    Record production waste
// @route   POST /api/production-orders/:id/waste
// @access  Private (Chef, Manager, Admin)
exports.recordProductionWaste = asyncHandler(async (req, res) => {
  const { waste_items } = req.body;

  if (!waste_items || waste_items.length === 0) {
    return res.status(400).json(
      ApiResponse.error('Waste items are required', 400)
    );
  }

  const productionOrder = await ProductionOrder.findById(req.params.id);
  if (!productionOrder) {
    return res.status(404).json(
      ApiResponse.error('Production order not found', 404)
    );
  }

  const WasteTransaction = require('../models/WasteTransaction');
  const Item = require('../models/Item');
  const Location = require('../models/Location');

  // Get kitchen location - use user's org_unit_id since production orders are created by kitchen staff
  const kitchenLocation = await Location.findOne({ 
    org_unit_id: req.user.org_unit_id,
    status: 'ACTIVE'
  });

  if (!kitchenLocation) {
    // If no location found, create a default one or use a fallback
    return res.status(400).json(
      ApiResponse.error(`Kitchen location not found for org unit: ${req.user.org_unit_id}`, 400)
    );
  }

  const wasteTransactions = [];

  // Create waste transactions for each waste item
  for (const wasteItem of waste_items) {
    const item = await Item.findById(wasteItem.item_id);
    if (!item) {
      continue; // Skip invalid items
    }

    const wasteValue = (item.cost_price || 0) * wasteItem.quantity_wasted;

    const wasteTransaction = await WasteTransaction.create({
      _id: `waste_prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      waste_type: 'PRODUCTION_WASTE',
      reference_type: 'PRODUCTION_ORDER',
      reference_id: productionOrder._id,
      item_id: wasteItem.item_id,
      lot_id: wasteItem.lot_id || null,
      quantity_wasted: wasteItem.quantity_wasted,
      uom_id: wasteItem.uom_id,
      unit_cost: item.cost_price || 0,
      total_waste_value: wasteValue,
      location_id: kitchenLocation._id,
      reason: wasteItem.reason || 'Production waste',
      notes: wasteItem.notes || '',
      disposal_method: wasteItem.disposal_method || 'TRASH',
      created_by: req.user.id
    });

    wasteTransactions.push(wasteTransaction);
  }

  // Notify manager if waste value is significant
  const totalWasteValue = wasteTransactions.reduce((sum, wt) => sum + wt.total_waste_value, 0);
  
  if (totalWasteValue > 500000) { // > 500k VND
    try {
      const { createNotificationInternal } = require('./notification.controller');
      await createNotificationInternal({
        recipient_role: 'MANAGER',
        title: 'High Production Waste Recorded',
        message: `Production order ${productionOrder.order_no} recorded ${totalWasteValue.toLocaleString()} VND in waste materials.`,
        type: 'URGENT',
        ref_type: 'PRODUCTION',
        ref_id: productionOrder._id
      });
    } catch (error) {
      console.error('Error creating waste notification:', error);
    }
  }

  return res.status(201).json(
    ApiResponse.success({
      production_order_id: productionOrder._id,
      waste_transactions: wasteTransactions,
      total_waste_value: totalWasteValue
    }, 'Production waste recorded successfully', 201)
  );
});