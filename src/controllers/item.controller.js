const asyncHandler = require('../utils/asyncHandler');
const Item = require('../models/Item');
const ApiResponse = require('../utils/ApiResponse');

// @desc    Get all items
// @route   GET /api/items
// @access  Private
exports.getItems = asyncHandler(async (req, res) => {
  const { item_type, status, category_id, search } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = {};
  if (item_type) filter.item_type = item_type;
  if (status) filter.status = status;
  if (category_id) filter.category_id = category_id;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } }
    ];
  }

  const items = await Item.find(filter)
    .populate('base_uom_id', 'code name')
    .populate('category_id', 'name')
    .skip(skip)
    .limit(limit)
    .sort({ created_at: -1 });

  const total = await Item.countDocuments(filter);

  return res.status(200).json(
    ApiResponse.paginate(items, page, limit, total)
  );
});

// @desc    Get single item
// @route   GET /api/items/:id
// @access  Private
exports.getItem = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id)
    .populate('base_uom_id', 'code name')
    .populate('category_id', 'name');

  if (!item) {
    return res.status(404).json(
      ApiResponse.error('Item not found', 404)
    );
  }

  return res.status(200).json(
    ApiResponse.success(item)
  );
});

// @desc    Create item
// @route   POST /api/items
// @access  Private (Manager, Admin)
exports.createItem = asyncHandler(async (req, res) => {
  const {
    _id,
    sku,
    name,
    item_type,
    base_uom_id,
    category_id,
    tracking_type,
    shelf_life_days,
    cost_price,
    base_sell_price
  } = req.body;

  // Check if SKU already exists
  const existingItem = await Item.findOne({ sku });
  if (existingItem) {
    return res.status(400).json(
      ApiResponse.error('SKU already exists', 400)
    );
  }

  const item = await Item.create({
    _id: _id || `item_${Date.now()}`,
    sku,
    name,
    item_type,
    base_uom_id,
    category_id,
    tracking_type: tracking_type || 'NONE',
    shelf_life_days: shelf_life_days || 0,
    cost_price: cost_price || 0,
    base_sell_price: base_sell_price || 0,
    status: 'ACTIVE'
  });

  const populatedItem = await Item.findById(item._id)
    .populate('base_uom_id', 'code name')
    .populate('category_id', 'name');

  return res.status(201).json(
    ApiResponse.success(populatedItem, 'Item created successfully', 201)
  );
});

// @desc    Update item
// @route   PUT /api/items/:id
// @access  Private (Manager, Admin)
exports.updateItem = asyncHandler(async (req, res) => {
  let item = await Item.findById(req.params.id);
  if (!item) {
    return res.status(404).json(
      ApiResponse.error('Item not found', 404)
    );
  }

  // Check if SKU is being changed and if it already exists
  if (req.body.sku && req.body.sku !== item.sku) {
    const existingItem = await Item.findOne({ sku: req.body.sku });
    if (existingItem) {
      return res.status(400).json(
        ApiResponse.error('SKU already exists', 400)
      );
    }
  }

  item = await Item.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('base_uom_id', 'code name')
   .populate('category_id', 'name');

  return res.status(200).json(
    ApiResponse.success(item, 'Item updated successfully')
  );
});

// @desc    Delete item
// @route   DELETE /api/items/:id
// @access  Private (Admin)
exports.deleteItem = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item) {
    return res.status(404).json(
      ApiResponse.error('Item not found', 404)
    );
  }

  // Soft delete by setting status to INACTIVE
  item.status = 'INACTIVE';
  await item.save();

  return res.status(200).json(
    ApiResponse.success(null, 'Item deactivated successfully')
  );
});
