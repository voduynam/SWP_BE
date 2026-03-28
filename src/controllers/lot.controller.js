const asyncHandler = require('../utils/asyncHandler');
const Lot = require('../models/Lot');
const InventoryBalance = require('../models/InventoryBalance');
const WasteTransaction = require('../models/WasteTransaction');
const Item = require('../models/Item');
const ApiResponse = require('../utils/ApiResponse');
const { createNotificationInternal } = require('./notification.controller');

// @desc    Get all lots
// @route   GET /api/lots
// @access  Private
exports.getLots = asyncHandler(async (req, res) => {
  const { item_id, lot_code } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = {};
  if (item_id) filter.item_id = item_id;
  if (lot_code) filter.lot_code = { $regex: lot_code, $options: 'i' };

  const lots = await Lot.find(filter)
    .populate('item_id', 'sku name item_type')
    .skip(skip)
    .limit(limit)
    .sort({ mfg_date: -1 });

  const total = await Lot.countDocuments(filter);

  return res.status(200).json(
    ApiResponse.paginate(lots, page, limit, total)
  );
});

// @desc    Get single lot
// @route   GET /api/lots/:id
// @access  Private
exports.getLot = asyncHandler(async (req, res) => {
  const lot = await Lot.findById(req.params.id)
    .populate('item_id', 'sku name item_type tracking_type shelf_life_days');

  if (!lot) {
    return res.status(404).json(
      ApiResponse.error('Lot not found', 404)
    );
  }

  return res.status(200).json(
    ApiResponse.success(lot)
  );
});

// @desc    Create lot
// @route   POST /api/lots
// @access  Private (Kitchen Staff, Manager, Admin)
exports.createLot = asyncHandler(async (req, res) => {
  const { _id, item_id, lot_code, mfg_date, exp_date } = req.body;

  // Check if lot code already exists
  const existingLot = await Lot.findOne({ lot_code });
  if (existingLot) {
    return res.status(400).json(
      ApiResponse.error('Lot code already exists', 400)
    );
  }

  const lot = await Lot.create({
    _id: _id || `lot_${Date.now()}`,
    item_id,
    lot_code,
    mfg_date: mfg_date || new Date(),
    exp_date: exp_date || null
  });

  const populatedLot = await Lot.findById(lot._id)
    .populate('item_id', 'sku name item_type');

  return res.status(201).json(
    ApiResponse.success(populatedLot, 'Lot created successfully', 201)
  );
});

// @desc    Update lot
// @route   PUT /api/lots/:id
// @access  Private (Kitchen Staff, Manager, Admin)
exports.updateLot = asyncHandler(async (req, res) => {
  const lot = await Lot.findById(req.params.id);
  if (!lot) {
    return res.status(404).json(
      ApiResponse.error('Lot not found', 404)
    );
  }

  // Check if lot code is being changed and if it already exists
  if (req.body.lot_code && req.body.lot_code !== lot.lot_code) {
    const existingLot = await Lot.findOne({ lot_code: req.body.lot_code });
    if (existingLot) {
      return res.status(400).json(
        ApiResponse.error('Lot code already exists', 400)
      );
    }
  }

  const updatedLot = await Lot.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('item_id', 'sku name item_type');

  return res.status(200).json(
    ApiResponse.success(updatedLot, 'Lot updated successfully')
  );
});

// @desc    Get lots with expiry status filter
// @route   GET /api/lots/expiry-status
// @access  Private
exports.getLotsByExpiryStatus = asyncHandler(async (req, res) => {
  const { status, location_id, item_type, days_to_expiry } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Build aggregation pipeline
  const pipeline = [
    {
      $lookup: {
        from: 'item',
        localField: 'item_id',
        foreignField: '_id',
        as: 'item'
      }
    },
    {
      $unwind: '$item'
    },
    {
      $lookup: {
        from: 'inventory_balance',
        localField: '_id',
        foreignField: 'lot_id',
        as: 'inventory'
      }
    }
  ];

  // Add filters
  const matchConditions = {};
  
  if (status) {
    if (Array.isArray(status)) {
      matchConditions.status = { $in: status };
    } else {
      matchConditions.status = status;
    }
  }

  if (item_type) {
    matchConditions['item.item_type'] = item_type;
  }

  if (location_id) {
    matchConditions['inventory.location_id'] = location_id;
  }

  // Filter by days to expiry
  if (days_to_expiry) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + parseInt(days_to_expiry));
    matchConditions.exp_date = { $lte: targetDate };
  }

  if (Object.keys(matchConditions).length > 0) {
    pipeline.push({ $match: matchConditions });
  }

  // Add expiry calculation
  pipeline.push({
    $addFields: {
      days_to_expiry: {
        $divide: [
          { $subtract: ['$exp_date', new Date()] },
          1000 * 60 * 60 * 24
        ]
      },
      total_quantity: {
        $sum: '$inventory.qty_on_hand'
      }
    }
  });

  // Sort by expiry date
  pipeline.push({ $sort: { exp_date: 1 } });

  // Get total count
  const countPipeline = [...pipeline, { $count: 'total' }];
  const countResult = await Lot.aggregate(countPipeline);
  const total = countResult.length > 0 ? countResult[0].total : 0;

  // Add pagination
  pipeline.push({ $skip: skip }, { $limit: limit });

  const lots = await Lot.aggregate(pipeline);

  return res.status(200).json(
    ApiResponse.paginate(lots, page, limit, total)
  );
});

// @desc    Get expiry summary
// @route   GET /api/lots/expiry-summary
// @access  Private
exports.getExpirySummary = asyncHandler(async (req, res) => {
  const { location_id } = req.query;
  const today = new Date();
  const nearExpiryDate = new Date();
  nearExpiryDate.setDate(today.getDate() + 7);

  const pipeline = [
    {
      $lookup: {
        from: 'inventory_balance',
        localField: '_id',
        foreignField: 'lot_id',
        as: 'inventory'
      }
    },
    {
      $unwind: { path: '$inventory', preserveNullAndEmptyArrays: true }
    },
    {
      $lookup: {
        from: 'item',
        localField: 'item_id',
        foreignField: '_id',
        as: 'item'
      }
    },
    {
      $unwind: '$item'
    }
  ];

  if (location_id) {
    pipeline.push({
      $match: { 'inventory.location_id': location_id }
    });
  }

  pipeline.push({
    $group: {
      _id: '$status',
      count: { $sum: 1 },
      total_quantity: { $sum: '$inventory.qty_on_hand' },
      total_value: { 
        $sum: { 
          $multiply: ['$inventory.qty_on_hand', '$item.cost_price'] 
        } 
      }
    }
  });

  const summary = await Lot.aggregate(pipeline);

  // Get specific counts
  const expiredCount = await Lot.countDocuments({
    status: 'EXPIRED'
  });

  const nearExpiryCount = await Lot.countDocuments({
    exp_date: { $lte: nearExpiryDate, $gt: today },
    status: { $in: ['ACTIVE', 'NEAR_EXPIRY'] }
  });

  const disposalPendingCount = await Lot.countDocuments({
    status: 'EXPIRED',
    disposal_status: { $ne: 'DISPOSED' }
  });

  return res.status(200).json(
    ApiResponse.success({
      summary: summary,
      alerts: {
        expired_count: expiredCount,
        near_expiry_count: nearExpiryCount,
        disposal_pending: disposalPendingCount
      }
    })
  );
});

// @desc    Dispose expired lot
// @route   PUT /api/lots/:id/dispose
// @access  Private (Manager, Admin, Chef)
exports.disposeLot = asyncHandler(async (req, res) => {
  const { disposal_reason, disposal_notes, disposal_method, quantity_disposed } = req.body;

  const lot = await Lot.findById(req.params.id)
    .populate('item_id', 'sku name cost_price');

  if (!lot) {
    return res.status(404).json(
      ApiResponse.error('Lot not found', 404)
    );
  }

  if (lot.status === 'DISPOSED') {
    return res.status(400).json(
      ApiResponse.error('Lot is already disposed', 400)
    );
  }

  // Get inventory balance for this lot
  const inventoryBalance = await InventoryBalance.findOne({ lot_id: lot._id });
  
  if (!inventoryBalance) {
    return res.status(400).json(
      ApiResponse.error('No inventory balance found for this lot', 400)
    );
  }

  const disposalQuantity = quantity_disposed || inventoryBalance.qty_on_hand;

  if (disposalQuantity > inventoryBalance.qty_on_hand) {
    return res.status(400).json(
      ApiResponse.error('Disposal quantity cannot exceed available quantity', 400)
    );
  }

  // Update lot status
  lot.status = 'DISPOSED';
  lot.disposal_status = 'DISPOSED';
  lot.disposed_date = new Date();
  lot.disposed_by = req.user.id;
  lot.disposal_reason = disposal_reason || 'Expired';
  lot.disposal_notes = disposal_notes || '';
  lot.disposal_method = disposal_method || 'TRASH';
  lot.updated_at = new Date();
  await lot.save();

  // Create waste transaction
  const wasteValue = (lot.item_id.cost_price || 0) * disposalQuantity;
  
  await WasteTransaction.create({
    _id: `waste_${Date.now()}`,
    waste_type: 'EXPIRED_MATERIAL',
    reference_type: 'LOT',
    reference_id: lot._id,
    item_id: lot.item_id._id,
    lot_id: lot._id,
    quantity_wasted: disposalQuantity,
    uom_id: inventoryBalance.uom_id,
    unit_cost: lot.item_id.cost_price || 0,
    total_waste_value: wasteValue,
    location_id: inventoryBalance.location_id,
    reason: disposal_reason || 'Expired material disposal',
    notes: disposal_notes || '',
    disposal_method: disposal_method || 'TRASH',
    created_by: req.user.id
  });

  // Update inventory balance
  inventoryBalance.qty_on_hand -= disposalQuantity;
  if (inventoryBalance.qty_on_hand <= 0) {
    inventoryBalance.qty_on_hand = 0;
  }
  await inventoryBalance.save();

  // Notify managers about disposal
  try {
    await createNotificationInternal({
      recipient_role: 'MANAGER',
      title: 'Material Disposed',
      message: `${disposalQuantity} units of ${lot.item_id.name} (${lot.lot_code}) disposed. Value: ${wasteValue.toLocaleString()} VND`,
      type: wasteValue > 1000000 ? 'URGENT' : 'INFO',
      ref_type: 'OTHER',
      ref_id: lot._id
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }

  const populatedLot = await Lot.findById(lot._id)
    .populate('item_id', 'sku name cost_price')
    .populate('disposed_by', 'username full_name');

  return res.status(200).json(
    ApiResponse.success(populatedLot, 'Lot disposed successfully')
  );
});

// @desc    Update lot expiry status (automated service)
// @route   PUT /api/lots/update-expiry-status
// @access  Private (System/Admin)
exports.updateExpiryStatus = asyncHandler(async (req, res) => {
  const today = new Date();
  const nearExpiryDate = new Date();
  nearExpiryDate.setDate(today.getDate() + 7); // 7 days warning

  // Update to NEAR_EXPIRY
  const nearExpiryResult = await Lot.updateMany(
    {
      exp_date: { $lte: nearExpiryDate, $gt: today },
      status: 'ACTIVE'
    },
    {
      status: 'NEAR_EXPIRY',
      updated_at: new Date()
    }
  );

  // Update to EXPIRED
  const expiredResult = await Lot.updateMany(
    {
      exp_date: { $lte: today },
      status: { $in: ['ACTIVE', 'NEAR_EXPIRY'] }
    },
    {
      status: 'EXPIRED',
      updated_at: new Date()
    }
  );

  // Get newly expired lots for notification
  const newlyExpired = await Lot.find({
    exp_date: { $lte: today },
    status: 'EXPIRED',
    updated_at: { $gte: new Date(Date.now() - 60000) }
  }).populate('item_id', 'sku name');

  // Send notifications for newly expired items
  if (newlyExpired.length > 0) {
    try {
      await createNotificationInternal({
        recipient_role: 'MANAGER',
        title: 'Items Expired - Action Required',
        message: `${newlyExpired.length} items have expired and require disposal action.`,
        type: 'URGENT',
        ref_type: 'OTHER',
        ref_id: 'expiry_alert'
      });
    } catch (error) {
      console.error('Error creating expiry notification:', error);
    }
  }

  return res.status(200).json(
    ApiResponse.success({
      near_expiry_updated: nearExpiryResult.modifiedCount,
      expired_updated: expiredResult.modifiedCount,
      newly_expired_items: newlyExpired.length
    }, 'Expiry status updated successfully')
  );
});