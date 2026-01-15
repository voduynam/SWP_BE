const asyncHandler = require('../utils/asyncHandler');
const ReturnRequest = require('../models/ReturnRequest');
const ReturnRequestLine = require('../models/ReturnRequestLine');
const GoodsReceipt = require('../models/GoodsReceipt');
const InventoryBalance = require('../models/InventoryBalance');
const InventoryTransaction = require('../models/InventoryTransaction');
const ApiResponse = require('../utils/ApiResponse');

// @desc    Get all return requests
// @route   GET /api/return-requests
// @access  Private
exports.getReturnRequests = asyncHandler(async (req, res) => {
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
    filter.return_date = {};
    if (start_date) filter.return_date.$gte = new Date(start_date);
    if (end_date) filter.return_date.$lte = new Date(end_date);
  }

  const returnRequests = await ReturnRequest.find(filter)
    .populate('store_org_unit_id', 'name code type')
    .populate('goods_receipt_id', 'receipt_no received_date')
    .populate('created_by', 'username full_name')
    .skip(skip)
    .limit(limit)
    .sort({ return_date: -1 });

  const total = await ReturnRequest.countDocuments(filter);

  return res.status(200).json(
    ApiResponse.paginate(returnRequests, page, limit, total)
  );
});

// @desc    Get single return request with lines
// @route   GET /api/return-requests/:id
// @access  Private
exports.getReturnRequest = asyncHandler(async (req, res) => {
  const returnRequest = await ReturnRequest.findById(req.params.id)
    .populate('store_org_unit_id', 'name code type')
    .populate('goods_receipt_id', 'receipt_no received_date')
    .populate('created_by', 'username full_name');

  if (!returnRequest) {
    return res.status(404).json(
      ApiResponse.error('Return request not found', 404)
    );
  }

  // Check access
  if (!req.user.roles.includes('ADMIN') && !req.user.roles.includes('MANAGER')) {
    if (returnRequest.store_org_unit_id._id.toString() !== req.user.org_unit_id) {
      return res.status(403).json(
        ApiResponse.error('Access denied', 403)
      );
    }
  }

  const returnLines = await ReturnRequestLine.find({ return_request_id: returnRequest._id })
    .populate('item_id', 'sku name item_type')
    .populate('lot_id', 'lot_code mfg_date exp_date')
    .populate('uom_id', 'code name');

  return res.status(200).json(
    ApiResponse.success({
      ...returnRequest.toObject(),
      lines: returnLines
    })
  );
});

// @desc    Create return request
// @route   POST /api/return-requests
// @access  Private (Store Staff, Manager, Admin)
exports.createReturnRequest = asyncHandler(async (req, res) => {
  const { store_org_unit_id, goods_receipt_id, return_date, reason, lines } = req.body;

  if (!lines || lines.length === 0) {
    return res.status(400).json(
      ApiResponse.error('Return request must have at least one line', 400)
    );
  }

  // Verify goods receipt exists
  if (goods_receipt_id) {
    const goodsReceipt = await GoodsReceipt.findById(goods_receipt_id);
    if (!goodsReceipt) {
      return res.status(404).json(
        ApiResponse.error('Goods receipt not found', 404)
      );
    }
  }

  // Generate return request number
  const returnCount = await ReturnRequest.countDocuments();
  const returnNo = `RR-${String(returnCount + 1).padStart(4, '0')}`;

  // Create return request
  const returnRequest = await ReturnRequest.create({
    _id: `rr_${Date.now()}`,
    return_no: returnNo,
    store_org_unit_id: store_org_unit_id || req.user.org_unit_id,
    goods_receipt_id: goods_receipt_id || null,
    return_date: return_date || new Date(),
    reason: reason || '',
    status: 'PENDING',
    created_by: req.user.id
  });

  // Create return request lines
  const returnLines = await Promise.all(
    lines.map(async (line, index) => {
      return await ReturnRequestLine.create({
        _id: `rr_line_${returnRequest._id}_${index}`,
        return_request_id: returnRequest._id,
        item_id: line.item_id,
        lot_id: line.lot_id || null,
        qty_return: line.qty_return,
        uom_id: line.uom_id,
        reason: line.reason || '',
        defect_type: line.defect_type || 'OTHER'
      });
    })
  );

  const populatedReturn = await ReturnRequest.findById(returnRequest._id)
    .populate('store_org_unit_id', 'name code type')
    .populate('goods_receipt_id', 'receipt_no received_date')
    .populate('created_by', 'username full_name');

  return res.status(201).json(
    ApiResponse.success({
      ...populatedReturn.toObject(),
      lines: returnLines
    }, 'Return request created successfully', 201)
  );
});

// @desc    Update return request status
// @route   PUT /api/return-requests/:id/status
// @access  Private (Manager, Admin)
exports.updateReturnStatus = asyncHandler(async (req, res) => {
  const { status, resolution_notes } = req.body;
  const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'CANCELLED'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json(
      ApiResponse.error('Invalid status', 400)
    );
  }

  const returnRequest = await ReturnRequest.findById(req.params.id);
  if (!returnRequest) {
    return res.status(404).json(
      ApiResponse.error('Return request not found', 404)
    );
  }

  returnRequest.status = status;
  if (resolution_notes) returnRequest.resolution_notes = resolution_notes;
  returnRequest.updated_at = new Date();
  await returnRequest.save();

  const populatedReturn = await ReturnRequest.findById(returnRequest._id)
    .populate('store_org_unit_id', 'name code type')
    .populate('goods_receipt_id', 'receipt_no received_date')
    .populate('created_by', 'username full_name');

  return res.status(200).json(
    ApiResponse.success(populatedReturn, 'Return request status updated successfully')
  );
});

// @desc    Process return (update inventory)
// @route   PUT /api/return-requests/:id/process
// @access  Private (Manager, Admin)
exports.processReturn = asyncHandler(async (req, res) => {
  const returnRequest = await ReturnRequest.findById(req.params.id);
  if (!returnRequest) {
    return res.status(404).json(
      ApiResponse.error('Return request not found', 404)
    );
  }

  if (returnRequest.status !== 'APPROVED') {
    return res.status(400).json(
      ApiResponse.error('Only approved return requests can be processed', 400)
    );
  }

  const returnLines = await ReturnRequestLine.find({ return_request_id: returnRequest._id })
    .populate('item_id')
    .populate('lot_id');

  // Get the store's location (assuming first location of the org unit)
  const Location = require('../models/Location');
  const storeLocation = await Location.findOne({ 
    org_unit_id: returnRequest.store_org_unit_id,
    status: 'ACTIVE'
  });

  if (!storeLocation) {
    return res.status(400).json(
      ApiResponse.error('Store location not found', 400)
    );
  }

  // Process each line and update inventory
  for (const line of returnLines) {
    // Reduce inventory at store location
    const balanceFilter = {
      location_id: storeLocation._id,
      item_id: line.item_id._id,
      lot_id: line.lot_id ? line.lot_id._id : null
    };

    const balance = await InventoryBalance.findOne(balanceFilter);
    if (!balance) {
      return res.status(400).json(
        ApiResponse.error(`Inventory balance not found for item ${line.item_id.sku}`, 400)
      );
    }

    if (balance.qty_on_hand < line.qty_return) {
      return res.status(400).json(
        ApiResponse.error(`Insufficient inventory for item ${line.item_id.sku}`, 400)
      );
    }

    balance.qty_on_hand -= line.qty_return;
    balance.updated_at = new Date();
    await balance.save();

    // Create inventory transaction
    await InventoryTransaction.create({
      txn_time: new Date(),
      location_id: storeLocation._id,
      item_id: line.item_id._id,
      lot_id: line.lot_id ? line.lot_id._id : null,
      qty: -line.qty_return,
      uom_id: line.uom_id,
      txn_type: 'RETURN_OUT',
      ref_type: 'RETURN_REQUEST',
      ref_id: returnRequest._id,
      created_by: req.user.id,
      notes: `Return: ${line.reason}`
    });
  }

  // Update return request status
  returnRequest.status = 'COMPLETED';
  returnRequest.updated_at = new Date();
  await returnRequest.save();

  const populatedReturn = await ReturnRequest.findById(returnRequest._id)
    .populate('store_org_unit_id', 'name code type')
    .populate('goods_receipt_id', 'receipt_no received_date')
    .populate('created_by', 'username full_name');

  return res.status(200).json(
    ApiResponse.success(populatedReturn, 'Return request processed and inventory updated')
  );
});
