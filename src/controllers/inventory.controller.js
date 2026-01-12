const asyncHandler = require('../utils/asyncHandler');
const InventoryBalance = require('../models/InventoryBalance');
const InventoryTransaction = require('../models/InventoryTransaction');
const Location = require('../models/Location');
const ApiResponse = require('../utils/ApiResponse');

// @desc    Get inventory balances
// @route   GET /api/inventory/balances
// @access  Private
exports.getInventoryBalances = asyncHandler(async (req, res) => {
  const { location_id, item_id, lot_id } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = {};
  if (location_id) filter.location_id = location_id;
  if (item_id) filter.item_id = item_id;
  if (lot_id) filter.lot_id = lot_id;

  // Filter by user's org unit locations if not admin/manager
  if (!req.user.roles.includes('ADMIN') && !req.user.roles.includes('MANAGER')) {
    const userLocations = await Location.find({ org_unit_id: req.user.org_unit_id });
    const locationIds = userLocations.map(l => l._id);
    filter.location_id = { $in: locationIds };
  }

  const balances = await InventoryBalance.find(filter)
    .populate('location_id', 'name code org_unit_id')
    .populate('item_id', 'sku name item_type')
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
  const { location_id, item_id, lot_id, txn_type, start_date, end_date } = req.query;
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

  // Filter by user's org unit locations if not admin/manager
  if (!req.user.roles.includes('ADMIN') && !req.user.roles.includes('MANAGER')) {
    const userLocations = await Location.find({ org_unit_id: req.user.org_unit_id });
    const locationIds = userLocations.map(l => l._id);
    filter.location_id = { $in: locationIds };
  }

  const transactions = await InventoryTransaction.find(filter)
    .populate('location_id', 'name code')
    .populate('item_id', 'sku name item_type')
    .populate('lot_id', 'lot_code mfg_date exp_date')
    .populate('uom_id', 'code name')
    .populate('created_by', 'username full_name')
    .skip(skip)
    .limit(limit)
    .sort({ txn_time: -1 });

  const total = await InventoryTransaction.countDocuments(filter);

  return res.status(200).json(
    ApiResponse.paginate(transactions, page, limit, total)
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
  } else if (!req.user.roles.includes('ADMIN') && !req.user.roles.includes('MANAGER')) {
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
      const itemValue = (b.item_id.cost_price || 0) * b.qty_on_hand;
      return sum + itemValue;
    }, 0),
    locations: {}
  };

  // Group by location
  balances.forEach(balance => {
    const locId = balance.location_id._id;
    if (!summary.locations[locId]) {
      summary.locations[locId] = {
        location: balance.location_id,
        item_count: 0,
        total_value: 0,
        items: []
      };
    }
    summary.locations[locId].item_count++;
    const itemValue = (balance.item_id.cost_price || 0) * balance.qty_on_hand;
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
  const { location_id, item_id, lot_id, qty, uom_id, reason } = req.body;

  if (!location_id || !item_id || qty === undefined) {
    return res.status(400).json(
      ApiResponse.error('Location, item, and quantity are required', 400)
    );
  }

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

  // Create transaction
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
    notes: reason
  });

  const populatedTransaction = await InventoryTransaction.findById(transaction._id)
    .populate('location_id', 'name code')
    .populate('item_id', 'sku name')
    .populate('lot_id', 'lot_code')
    .populate('uom_id', 'code name');

  return res.status(201).json(
    ApiResponse.success(populatedTransaction, 'Inventory adjusted successfully', 201)
  );
});
