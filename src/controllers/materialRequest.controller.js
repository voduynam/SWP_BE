const asyncHandler = require('../utils/asyncHandler');
const MaterialRequest = require('../models/MaterialRequest');
const MaterialRequestLine = require('../models/MaterialRequestLine');
const InventoryBalance = require('../models/InventoryBalance');
const Item = require('../models/Item');
const ApiResponse = require('../utils/ApiResponse');
const { createNotificationInternal } = require('./notification.controller');

// @desc    Get all material requests
// @route   GET /api/material-requests
// @access  Private
exports.getMaterialRequests = asyncHandler(async (req, res) => {
  const { status, priority, request_reason, start_date, end_date } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = {};
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (request_reason) filter.request_reason = request_reason;

  // Filter by user role
  if (req.user.roles.includes('CHEF')) {
    filter.requested_by = req.user.id;
  }

  if (start_date || end_date) {
    filter.request_date = {};
    if (start_date) filter.request_date.$gte = new Date(start_date);
    if (end_date) filter.request_date.$lte = new Date(end_date);
  }

  const requests = await MaterialRequest.find(filter)
    .populate('requested_by', 'username full_name')
    .populate('reviewed_by', 'username full_name')
    .populate('location_id', 'name code')
    .populate('production_order_id', 'order_no')
    .skip(skip)
    .limit(limit)
    .sort({ request_date: -1 });

  const total = await MaterialRequest.countDocuments(filter);

  return res.status(200).json(
    ApiResponse.paginate(requests, page, limit, total)
  );
});

// @desc    Get single material request with lines
// @route   GET /api/material-requests/:id
// @access  Private
exports.getMaterialRequest = asyncHandler(async (req, res) => {
  const request = await MaterialRequest.findById(req.params.id)
    .populate('requested_by', 'username full_name')
    .populate('reviewed_by', 'username full_name')
    .populate('location_id', 'name code')
    .populate('production_order_id', 'order_no');

  if (!request) {
    return res.status(404).json(
      ApiResponse.error('Material request not found', 404)
    );
  }

  // Check access
  if (req.user.roles.includes('CHEF') && request.requested_by._id !== req.user.id) {
    return res.status(403).json(
      ApiResponse.error('Access denied', 403)
    );
  }

  const requestLines = await MaterialRequestLine.find({ material_request_id: request._id })
    .populate('item_id', 'sku name item_type cost_price')
    .populate('uom_id', 'code name')
    .populate('supplier_preference', 'name contact_info');

  return res.status(200).json(
    ApiResponse.success({
      ...request.toObject(),
      lines: requestLines
    })
  );
});

// @desc    Create material request
// @route   POST /api/material-requests
// @access  Private (Chef, Manager, Admin)
exports.createMaterialRequest = asyncHandler(async (req, res) => {
  const { 
    priority, 
    request_reason, 
    production_order_id, 
    location_id, 
    notes, 
    expected_delivery,
    lines 
  } = req.body;

  if (!lines || lines.length === 0) {
    return res.status(400).json(
      ApiResponse.error('Material request must have at least one line', 400)
    );
  }

  // Generate request number
  const requestCount = await MaterialRequest.countDocuments();
  const requestNo = `MR-${String(requestCount + 1).padStart(4, '0')}`;

  // Create material request
  const materialRequest = await MaterialRequest.create({
    _id: `mr_${Date.now()}`,
    request_no: requestNo,
    requested_by: req.user.id,
    priority: priority || 'MEDIUM',
    request_reason: request_reason,
    production_order_id: production_order_id || null,
    location_id: location_id,
    notes: notes || '',
    expected_delivery: expected_delivery || null
  });

  // Create request lines with current stock check
  const requestLines = await Promise.all(
    lines.map(async (line, index) => {
      // Get current stock
      const currentStock = await InventoryBalance.findOne({
        location_id: location_id,
        item_id: line.item_id
      });

      // Get item for cost estimation
      const item = await Item.findById(line.item_id);
      const estimatedCost = item ? (item.cost_price || 0) * line.quantity_requested : 0;

      return await MaterialRequestLine.create({
        _id: `mr_line_${materialRequest._id}_${index}`,
        material_request_id: materialRequest._id,
        item_id: line.item_id,
        quantity_requested: line.quantity_requested,
        uom_id: line.uom_id,
        current_stock: currentStock ? currentStock.qty_on_hand : 0,
        minimum_required: line.minimum_required || line.quantity_requested,
        urgency_level: line.urgency_level || 'MEDIUM',
        reason: line.reason || '',
        estimated_cost: estimatedCost,
        supplier_preference: line.supplier_preference || null,
        notes: line.notes || ''
      });
    })
  );

  // Notify managers about new material request
  try {
    await createNotificationInternal({
      recipient_role: 'MANAGER',
      title: 'New Material Request Pending Approval',
      message: `Material request ${requestNo} from ${req.user.full_name} requires approval. Priority: ${priority}`,
      type: priority === 'URGENT' ? 'URGENT' : 'INFO',
      ref_type: 'OTHER',
      ref_id: materialRequest._id
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }

  const populatedRequest = await MaterialRequest.findById(materialRequest._id)
    .populate('requested_by', 'username full_name')
    .populate('location_id', 'name code')
    .populate('production_order_id', 'order_no');

  return res.status(201).json(
    ApiResponse.success({
      ...populatedRequest.toObject(),
      lines: requestLines
    }, 'Material request created successfully', 201)
  );
});

// @desc    Review material request (approve/reject)
// @route   PUT /api/material-requests/:id/review
// @access  Private (Manager, Admin)
exports.reviewMaterialRequest = asyncHandler(async (req, res) => {
  const { action, rejection_reason, approved_quantities, expected_delivery } = req.body;

  if (!['APPROVE', 'REJECT'].includes(action)) {
    return res.status(400).json(
      ApiResponse.error('Action must be APPROVE or REJECT', 400)
    );
  }

  if (action === 'REJECT' && !rejection_reason) {
    return res.status(400).json(
      ApiResponse.error('Rejection reason is required when rejecting', 400)
    );
  }

  const materialRequest = await MaterialRequest.findById(req.params.id)
    .populate('requested_by', 'username full_name');

  if (!materialRequest) {
    return res.status(404).json(
      ApiResponse.error('Material request not found', 404)
    );
  }

  if (materialRequest.status !== 'PENDING') {
    return res.status(400).json(
      ApiResponse.error('Only pending material requests can be reviewed', 400)
    );
  }

  // Update material request
  materialRequest.status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
  materialRequest.reviewed_by = req.user.id;
  materialRequest.reviewed_at = new Date();
  if (action === 'REJECT') {
    materialRequest.rejection_reason = rejection_reason;
  }
  if (expected_delivery) {
    materialRequest.expected_delivery = expected_delivery;
  }
  materialRequest.updated_at = new Date();
  await materialRequest.save();

  // Update approved quantities if provided
  if (action === 'APPROVE' && approved_quantities) {
    const requestLines = await MaterialRequestLine.find({ 
      material_request_id: materialRequest._id 
    });

    for (const line of requestLines) {
      const approvedQty = approved_quantities[line.item_id];
      if (approvedQty !== undefined) {
        line.quantity_approved = approvedQty;
        await line.save();
      }
    }
  }

  // Notify requester about decision
  try {
    await createNotificationInternal({
      recipient_id: materialRequest.requested_by._id,
      recipient_role: 'CHEF',
      title: `Material Request ${action === 'APPROVE' ? 'Approved' : 'Rejected'}`,
      message: action === 'APPROVE' 
        ? `Your material request ${materialRequest.request_no} has been approved.`
        : `Your material request ${materialRequest.request_no} has been rejected. Reason: ${rejection_reason}`,
      type: action === 'APPROVE' ? 'SUCCESS' : 'ERROR',
      ref_type: 'OTHER',
      ref_id: materialRequest._id
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }

  const populatedRequest = await MaterialRequest.findById(materialRequest._id)
    .populate('requested_by', 'username full_name')
    .populate('reviewed_by', 'username full_name')
    .populate('location_id', 'name code');

  return res.status(200).json(
    ApiResponse.success(populatedRequest, `Material request ${action.toLowerCase()}d successfully`)
  );
});

// @desc    Check stock levels and suggest material requests
// @route   GET /api/material-requests/stock-check
// @access  Private (Chef, Manager, Admin)
exports.checkStockLevels = asyncHandler(async (req, res) => {
  const { location_id } = req.query;

  if (!location_id) {
    return res.status(400).json(
      ApiResponse.error('Location ID is required', 400)
    );
  }

  // Get low stock items
  const lowStockItems = await InventoryBalance.find({
    location_id: location_id,
    $expr: { $lte: ['$qty_on_hand', '$reorder_point'] }
  })
  .populate('item_id', 'sku name item_type cost_price')
  .populate('uom_id', 'code name');

  // Get expired/near expiry items
  const today = new Date();
  const nearExpiryDate = new Date();
  nearExpiryDate.setDate(today.getDate() + 7); // 7 days from now

  const expiryItems = await InventoryBalance.aggregate([
    {
      $lookup: {
        from: 'lot',
        localField: 'lot_id',
        foreignField: '_id',
        as: 'lot'
      }
    },
    {
      $unwind: '$lot'
    },
    {
      $match: {
        location_id: location_id,
        'lot.exp_date': { $lte: nearExpiryDate },
        'lot.status': { $in: ['ACTIVE', 'NEAR_EXPIRY', 'EXPIRED'] }
      }
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
  ]);

  return res.status(200).json(
    ApiResponse.success({
      low_stock_items: lowStockItems,
      expiry_items: expiryItems,
      suggestions: {
        urgent_reorder: lowStockItems.filter(item => item.qty_on_hand <= 0),
        reorder_soon: lowStockItems.filter(item => item.qty_on_hand > 0),
        expiry_replacement: expiryItems.filter(item => item.lot.exp_date <= today),
        near_expiry_watch: expiryItems.filter(item => item.lot.exp_date > today)
      }
    })
  );
});

// @desc    Update material request status
// @route   PUT /api/material-requests/:id/status
// @access  Private (Manager, Admin)
exports.updateMaterialRequestStatus = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;
  const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'CANCELLED'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json(
      ApiResponse.error('Invalid status', 400)
    );
  }

  const materialRequest = await MaterialRequest.findById(req.params.id);
  if (!materialRequest) {
    return res.status(404).json(
      ApiResponse.error('Material request not found', 404)
    );
  }

  materialRequest.status = status;
  if (notes) materialRequest.notes = notes;
  materialRequest.updated_at = new Date();
  await materialRequest.save();

  const populatedRequest = await MaterialRequest.findById(materialRequest._id)
    .populate('requested_by', 'username full_name')
    .populate('reviewed_by', 'username full_name')
    .populate('location_id', 'name code');

  return res.status(200).json(
    ApiResponse.success(populatedRequest, 'Material request status updated successfully')
  );
});