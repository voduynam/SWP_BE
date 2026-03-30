const asyncHandler = require('../utils/asyncHandler');
const InventoryBalance = require('../models/InventoryBalance');
const InventoryTransaction = require('../models/InventoryTransaction');
const Location = require('../models/Location');
const ApiResponse = require('../utils/ApiResponse');

// @desc    Get inventory balances
// @route   GET /api/inventory/balances
// @access  Private
exports.getInventoryBalances = asyncHandler(async (req, res) => {
  const { location_id, item_id, lot_id, search } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = {};
  if (location_id) filter.location_id = location_id;
  if (item_id) filter.item_id = item_id;
  if (lot_id) filter.lot_id = lot_id;

  if (search) {
    const Item = require('../models/Item');
    const Location = require('../models/Location');
    const searchRegex = { $regex: search, $options: 'i' };
    
    const matchingItems = await Item.find({
      $or: [{ name: searchRegex }, { sku: searchRegex }]
    }).select('_id');
    
    const matchingLocs = await Location.find({
      $or: [{ name: searchRegex }, { code: searchRegex }]
    }).select('_id');

    filter.$or = [
      { item_id: { $in: matchingItems.map(i => i._id) } },
      { location_id: { $in: matchingLocs.map(l => l._id) } }
    ];
  }

  // Filter by user's org unit locations if not admin/manager/supply coordinator
  if (
    !req.user.roles.includes('ADMIN') &&
    !req.user.roles.includes('MANAGER') &&
    !req.user.roles.includes('SUPPLY_COORDINATOR')
  ) {
    const userLocations = await Location.find({ org_unit_id: req.user.org_unit_id });
    const locationIds = userLocations.map(l => l._id);
    filter.location_id = { $in: locationIds };
  }

  const balances = await InventoryBalance.find(filter)
    .populate('location_id', 'name code org_unit_id')
    .populate('item_id', 'sku name item_type cost_price')
    .populate('lot_id', 'lot_code mfg_date exp_date')
    .skip(skip)
    .limit(limit)
    .sort({ updated_at: -1 });

  const total = await InventoryBalance.countDocuments(filter);

  return res.status(200).json(
    ApiResponse.paginate(balances, page, limit, total)
  );
});

// @desc    Get inventory transactions
// @route   GET /api/inventory/transactions
// @access  Private
exports.getInventoryTransactions = asyncHandler(async (req, res) => {
  const { location_id, item_id, lot_id, txn_type, start_date, end_date, search } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = {};
  if (location_id) filter.location_id = location_id;
  if (item_id) filter.item_id = item_id;
  if (lot_id) filter.lot_id = lot_id;
  if (txn_type) filter.txn_type = txn_type;
  if (start_date || end_date) {
    filter.txn_time = {};
    if (start_date) filter.txn_time.$gte = new Date(start_date);
    if (end_date) filter.txn_time.$lte = new Date(end_date);
  }

  if (search) {
    const Item = require('../models/Item');
    const Location = require('../models/Location');
    const searchRegex = { $regex: search, $options: 'i' };
    
    // Find matching items by name or SKU
    const matchingItems = await Item.find({
      $or: [{ name: searchRegex }, { sku: searchRegex }]
    }).select('_id');
    const itemIds = matchingItems.map(i => i._id);

    // Find matching locations by name or code
    const matchingLocs = await Location.find({
      $or: [{ name: searchRegex }, { code: searchRegex }]
    }).select('_id');
    const locIds = matchingLocs.map(l => l._id);

    filter.$or = [
      { item_id: { $in: itemIds } },
      { location_id: { $in: locIds } },
      { notes: searchRegex }
    ];
  }

  // Filter by user's org unit locations if not admin/manager/supply coordinator
  if (
    !req.user.roles.includes('ADMIN') &&
    !req.user.roles.includes('MANAGER') &&
    !req.user.roles.includes('SUPPLY_COORDINATOR')
  ) {
    const userLocations = await Location.find({ org_unit_id: req.user.org_unit_id });
    const locationIds = userLocations.map(l => l._id);
    filter.location_id = { $in: locationIds };
  }

  const transactions = await InventoryTransaction.find(filter)
    .populate('location_id', 'name code')
    .populate('item_id', 'sku name item_type cost_price')
    .populate('lot_id', 'lot_code mfg_date exp_date')
    .populate('uom_id', 'code name')
    .populate('created_by', 'username full_name')
    .skip(skip)
    .limit(limit)
    .sort({ txn_time: -1 });

  // Add calculated cost information for transactions that don't have it
  const transactionsWithCost = transactions.map(txn => {
    const txnObj = txn.toObject();
    if (!txnObj.unit_cost && txnObj.item_id?.cost_price) {
      txnObj.unit_cost = txnObj.item_id.cost_price;
      txnObj.total_value = txnObj.unit_cost * Math.abs(txnObj.qty);
    }
    return txnObj;
  });

  const total = await InventoryTransaction.countDocuments(filter);

  return res.status(200).json(
    ApiResponse.paginate(transactionsWithCost, page, limit, total)
  );
});

// @desc    Get inventory summary by location
// @route   GET /api/inventory/summary
// @access  Private
exports.getInventorySummary = asyncHandler(async (req, res) => {
  const { location_id } = req.query;

  const filter = {};
  if (location_id) {
    filter.location_id = location_id;
  } else if (
    !req.user.roles.includes('ADMIN') &&
    !req.user.roles.includes('MANAGER') &&
    !req.user.roles.includes('SUPPLY_COORDINATOR')
  ) {
    const userLocations = await Location.find({ org_unit_id: req.user.org_unit_id });
    const locationIds = userLocations.map(l => l._id);
    filter.location_id = { $in: locationIds };
  }

  const balances = await InventoryBalance.find(filter)
    .populate('location_id', 'name code')
    .populate('item_id', 'sku name item_type cost_price')
    .populate('lot_id', 'lot_code mfg_date exp_date');

  // Calculate summary
  const summary = {
    total_items: balances.length,
    total_value: balances.reduce((sum, b) => {
      const itemValue = (b.item_id?.cost_price || 0) * (b.qty_on_hand || 0);
      return sum + itemValue;
    }, 0),
    locations: {}
  };

  // Group by location
  balances.forEach(balance => {
    const locId = balance.location_id?._id || balance.location_id;
    if (!locId) return;
    
    if (!summary.locations[locId]) {
      summary.locations[locId] = {
        location: balance.location_id,
        item_count: 0,
        total_value: 0,
        items: []
      };
    }
    summary.locations[locId].item_count++;
    const itemValue = (balance.item_id?.cost_price || 0) * (balance.qty_on_hand || 0);
    summary.locations[locId].total_value += itemValue;
    summary.locations[locId].items.push(balance);
  });

  return res.status(200).json(
    ApiResponse.success(summary)
  );
});

// @desc    Adjust inventory
// @route   POST /api/inventory/adjust
// @access  Private (Manager, Admin)
exports.adjustInventory = asyncHandler(async (req, res) => {
  const { location_id, item_id, lot_id, qty, uom_id, reason, unit_cost } = req.body;

  if (!location_id || !item_id || qty === undefined) {
    return res.status(400).json(
      ApiResponse.error('Location, item, and quantity are required', 400)
    );
  }

  // Get item to fetch cost_price if unit_cost not provided
  const Item = require('../models/Item');
  const item = await Item.findById(item_id);
  if (!item) {
    return res.status(404).json(
      ApiResponse.error('Item not found', 404)
    );
  }

  // Use provided unit_cost or fall back to item's cost_price
  const finalUnitCost = unit_cost !== undefined && unit_cost !== null 
    ? unit_cost 
    : item.cost_price || 0;

  const totalValue = Math.abs(qty) * finalUnitCost;

  // Get or create inventory balance
  const balanceFilter = {
    location_id,
    item_id,
    lot_id: lot_id || null
  };

  let balance = await InventoryBalance.findOne(balanceFilter);
  if (!balance) {
    balance = await InventoryBalance.create({
      location_id,
      item_id,
      lot_id: lot_id || null,
      qty_on_hand: 0,
      qty_reserved: 0
    });
  }

  // Update balance
  balance.qty_on_hand += qty;
  if (balance.qty_on_hand < 0) {
    return res.status(400).json(
      ApiResponse.error('Insufficient inventory', 400)
    );
  }
  balance.updated_at = new Date();
  await balance.save();

  // Create transaction with cost information
  const transaction = await InventoryTransaction.create({
    txn_time: new Date(),
    location_id,
    item_id,
    lot_id: lot_id || null,
    qty,
    uom_id,
    txn_type: 'ADJUSTMENT',
    ref_type: 'ADJUSTMENT',
    created_by: req.user.id,
    notes: reason,
    unit_cost: finalUnitCost,
    total_value: qty > 0 ? totalValue : -totalValue // Negative for outbound
  });

  const populatedTransaction = await InventoryTransaction.findById(transaction._id)
    .populate('location_id', 'name code')
    .populate('item_id', 'sku name cost_price')
    .populate('lot_id', 'lot_code')
    .populate('uom_id', 'code name')
    .populate('created_by', 'username full_name');

  return res.status(201).json(
    ApiResponse.success({
      ...populatedTransaction.toObject(),
      cost_summary: {
        unit_cost: finalUnitCost,
        quantity: qty,
        total_value: qty > 0 ? totalValue : -totalValue,
        currency: 'VND'
      }
    }, 'Inventory adjusted successfully with cost tracking', 201)
  );
});

// @desc    Get inventory balances grouped by item and location
// @route   GET /api/inventory/balances/grouped
// @access  Private
exports.getInventoryBalancesGrouped = asyncHandler(async (req, res) => {
  const { location_id, search } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 15;
  const skip = (page - 1) * limit;

  const mongoose = require('mongoose');
  const match = {};
  
  if (location_id) {
    match.location_id = new mongoose.Types.ObjectId(location_id);
  }

  if (
    !req.user.roles.includes('ADMIN') &&
    !req.user.roles.includes('MANAGER') &&
    !req.user.roles.includes('SUPPLY_COORDINATOR')
  ) {
    const userLocations = await Location.find({ org_unit_id: req.user.org_unit_id });
    match.location_id = { $in: userLocations.map(l => l._id) };
  }

  if (search) {
     const Item = require('../models/Item');
     const searchRegex = { $regex: search, $options: 'i' };
     const matchingItems = await Item.find({ $or: [{ name: searchRegex }, { sku: searchRegex }] }).select('_id');
     const matchingLocs = await Location.find({ $or: [{ name: searchRegex }, { code: searchRegex }] }).select('_id');
     match.$or = [
       { item_id: { $in: matchingItems.map(i => i._id) } },
       { location_id: { $in: matchingLocs.map(l => l._id) } }
     ];
  }

  const pipeline = [
    { $match: match },
    {
       $lookup: {
         from: 'lot',
         localField: 'lot_id',
         foreignField: '_id',
         as: 'lot_info'
       }
    },
    { $unwind: { path: '$lot_info', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: { location_id: '$location_id', item_id: '$item_id' },
        qty_on_hand: { $sum: '$qty_on_hand' },
        qty_reserved: { $sum: '$qty_reserved' },
        lots: {
          $push: {
            lot_id: '$lot_info',
            qty_on_hand: '$qty_on_hand',
            qty_reserved: '$qty_reserved'
          }
        }
      }
    },
    { $sort: { '_id.location_id': 1, '_id.item_id': 1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: 'location',
        localField: '_id.location_id',
        foreignField: '_id',
        as: 'location'
      }
    },
    { $unwind: { path: '$location', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'item',
        localField: '_id.item_id',
        foreignField: '_id',
        as: 'item'
      }
    },
    { $unwind: { path: '$item', preserveNullAndEmptyArrays: true } }
  ];

  const results = await InventoryBalance.aggregate(pipeline);

  // Count total groups
  const countPipeline = [
    { $match: match },
    { $group: { _id: { location_id: '$location_id', item_id: '$item_id' } } },
    { $count: 'total' }
  ];
  const countResult = await InventoryBalance.aggregate(countPipeline);
  const total = countResult.length > 0 ? countResult[0].total : 0;

  // Format response to match FE 
  const formattedResults = results.map(r => ({
    key: `${r._id.location_id}_${r._id.item_id}`,
    location_id: r.location,
    item_id: r.item,
    qty_on_hand: r.qty_on_hand,
    qty_reserved: r.qty_reserved,
    lots: r.lots.filter(l => l.qty_on_hand !== 0 || l.qty_reserved !== 0 || l.lot_id)
  }));

  return res.status(200).json(
    ApiResponse.paginate(formattedResults, page, limit, total)
  );
});
