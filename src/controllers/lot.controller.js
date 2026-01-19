const asyncHandler = require('../utils/asyncHandler');
const Lot = require('../models/Lot');
const ApiResponse = require('../utils/ApiResponse');

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
