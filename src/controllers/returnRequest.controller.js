const asyncHandler = require('../utils/asyncHandler');
const ReturnRequest = require('../models/ReturnRequest');
const ReturnRequestLine = require('../models/ReturnRequestLine');
const GoodsReceipt = require('../models/GoodsReceipt');
const InventoryBalance = require('../models/InventoryBalance');
const InventoryTransaction = require('../models/InventoryTransaction');
const InternalOrder = require('../models/InternalOrder');
const InternalOrderLine = require('../models/InternalOrderLine');
const Item = require('../models/Item');
const Recipe = require('../models/Recipe');
const RecipeLine = require('../models/RecipeLine');
const ApiResponse = require('../utils/ApiResponse');
const { createNotificationInternal } = require('./notification.controller');

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

// @desc    Create return request with evidence photos
// @route   POST /api/return-requests
// @access  Private (Store Staff, Manager, Admin)
exports.createReturnRequest = asyncHandler(async (req, res) => {
  const { store_org_unit_id, goods_receipt_id, return_date, reason } = req.body;
  let { lines } = req.body;

  // multipart/form-data sends nested values as strings
  if (typeof lines === 'string') {
    try {
      lines = JSON.parse(lines);
    } catch (e) {
      return res.status(400).json(
        ApiResponse.error('Invalid lines JSON', 400)
      );
    }
  }

  if (!Array.isArray(lines) || lines.length === 0) {
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

  // Process uploaded evidence photos
  let evidencePhotos = [];
  if (req.files && req.files.length > 0) {
    evidencePhotos = req.files.map(file => ({
      photo_url: `/uploads/return-evidence/${file.filename}`,
      uploaded_at: new Date(),
      description: `Evidence photo for return ${returnNo}`
    }));
  } else {
    return res.status(400).json(
      ApiResponse.error('Evidence photos are required', 400)
    );
  }

  // Create return request
  const returnRequest = await ReturnRequest.create({
    _id: `rr_${Date.now()}`,
    return_no: returnNo,
    store_org_unit_id: store_org_unit_id || req.user.org_unit_id,
    goods_receipt_id: goods_receipt_id || null,
    return_date: return_date || new Date(),
    reason: reason || '',
    status: 'PENDING',
    evidence_photos: evidencePhotos,
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

  // Notify managers about new return request
  try {
    await createNotificationInternal({
      recipient_role: 'MANAGER',
      title: 'New Return Request Pending Approval',
      message: `Return request ${returnNo} from store requires manager approval. Reason: ${reason}`,
      type: 'URGENT',
      ref_type: 'RETURN_REQUEST',
      ref_id: returnRequest._id
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }

  const populatedReturn = await ReturnRequest.findById(returnRequest._id)
    .populate('store_org_unit_id', 'name code type')
    .populate('goods_receipt_id', 'receipt_no received_date')
    .populate('created_by', 'username full_name');

  return res.status(201).json(
    ApiResponse.success({
      ...populatedReturn.toObject(),
      lines: returnLines
    }, 'Return request created successfully with evidence photos', 201)
  );
});

// @desc    Manager approve/reject return request
// @route   PUT /api/return-requests/:id/review
// @access  Private (Manager, Admin)
exports.reviewReturnRequest = asyncHandler(async (req, res) => {
  const { action, rejection_reason } = req.body; // action: 'APPROVE' or 'REJECT'

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

  const returnRequest = await ReturnRequest.findById(req.params.id)
    .populate('store_org_unit_id', 'name code type')
    .populate('created_by', 'username full_name');

  if (!returnRequest) {
    return res.status(404).json(
      ApiResponse.error('Return request not found', 404)
    );
  }

  if (returnRequest.status !== 'PENDING') {
    return res.status(400).json(
      ApiResponse.error('Only pending return requests can be reviewed', 400)
    );
  }

  // Update return request
  returnRequest.status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
  returnRequest.reviewed_by = req.user.id;
  returnRequest.reviewed_at = new Date();
  if (action === 'REJECT') {
    returnRequest.rejection_reason = rejection_reason;
  }
  returnRequest.updated_at = new Date();
  await returnRequest.save();

  if (action === 'APPROVE') {
    console.log('Return request approved - creating replacement order');
    
    try {
      // Create replacement order with proper lines using helper function
      const replacementOrder = await createReplacementOrder(returnRequest, req.user.id);
      
      if (replacementOrder) {
        // Update return request with replacement order info
        returnRequest.replacement_order_id = replacementOrder._id;
        await returnRequest.save();

        console.log('Replacement order created:', replacementOrder.order_no);

        // Notify kitchen staff
        await createNotificationInternal({
          recipient_role: 'CHEF',
          title: 'Đơn Hàng Bù Lại',
          message: `Đơn hàng ${replacementOrder.order_no} được tạo để bù cho phiếu trả hàng ${returnRequest.return_no}. Vui lòng chuẩn bị hàng hóa.`,
          type: 'URGENT',
          ref_type: 'ORDER',
          ref_id: replacementOrder._id
        });
      }
    } catch (error) {
      console.error('Error creating replacement order:', error);
      // Don't fail the approval if replacement order creation fails
      console.log('Continuing with approval despite replacement order error');
    }
  }

  // Notify store staff about decision
  try {
    await createNotificationInternal({
      recipient_id: returnRequest.created_by,
      recipient_role: 'STORE_STAFF',
      title: `Return Request ${action === 'APPROVE' ? 'Approved' : 'Rejected'}`,
      message: action === 'APPROVE' 
        ? `Your return request ${returnRequest.return_no} has been approved. Replacement order will be prepared.`
        : `Your return request ${returnRequest.return_no} has been rejected. Reason: ${rejection_reason}`,
      type: action === 'APPROVE' ? 'SUCCESS' : 'ERROR',
      ref_type: 'RETURN_REQUEST',
      ref_id: returnRequest._id
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }

  const populatedReturn = await ReturnRequest.findById(returnRequest._id)
    .populate('store_org_unit_id', 'name code type')
    .populate('created_by', 'username full_name')
    .populate('reviewed_by', 'username full_name')
    .populate('replacement_order_id', 'order_no status total_amount');

  return res.status(200).json(
    ApiResponse.success(populatedReturn, `Return request ${action.toLowerCase()}d successfully`)
  );
});

// @desc    Update return request status (legacy endpoint)
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

// Helper function to create replacement order
async function createReplacementOrder(returnRequest, managerId) {
  try {
    // Get return request lines
    const returnLines = await ReturnRequestLine.find({ 
      return_request_id: returnRequest._id 
    }).populate('item_id').populate('uom_id');

    console.log('Return lines found:', returnLines.length);
    if (returnLines.length > 0) {
      console.log('First line UOM:', returnLines[0].uom_id);
    }

    // Generate order number
    const orderCount = await InternalOrder.countDocuments();
    const orderNo = `REP-${String(orderCount + 1).padStart(4, '0')}`;
    const orderId = `rep_${Date.now()}`;

    console.log('Creating order with ID:', orderId);

    // Calculate total cost (for tracking, but order is free for customer)
    let totalCost = 0;

    // Create replacement order (free for customer)
    const replacementOrder = await InternalOrder.create({
      _id: orderId,
      order_no: orderNo,
      store_org_unit_id: returnRequest.store_org_unit_id,
      order_date: new Date(),
      status: 'APPROVED', // Auto-approved since it's a replacement
      created_by: managerId,
      total_amount: 0, // Free for customer
      currency: 'VND',
      is_urgent: true, // Replacements are urgent
      payment_status: 'PAID', // Considered paid since it's free
      payment_method: 'ONLINE'
    });

    console.log('Order created:', replacementOrder._id);

    // Create order lines
    const createdLines = [];
    for (let i = 0; i < returnLines.length; i++) {
      const line = returnLines[i];
      const item = line.item_id;
      
      // Get UOM ID - handle both populated and non-populated cases
      const uomId = line.uom_id._id || line.uom_id;
      
      console.log(`Creating line ${i}:`, {
        order_id: replacementOrder._id,
        item_id: line.item_id._id,
        qty_ordered: line.qty_return,
        uom_id: uomId
      });
      
      // Calculate cost based on item cost price
      const unitCost = item.cost_price || 0;
      const lineCost = unitCost * line.qty_return;
      totalCost += lineCost;

      const orderLine = await InternalOrderLine.create({
        _id: `rep_line_${Date.now()}_${i}`,
        order_id: replacementOrder._id,
        item_id: line.item_id._id,
        qty_ordered: line.qty_return,
        uom_id: uomId,
        unit_price: 0, // Free for customer
        line_total: 0 // Free for customer
      });
      
      createdLines.push(orderLine);
    }

    // Track replacement cost in return request
    await ReturnRequest.findByIdAndUpdate(returnRequest._id, {
      replacement_cost: totalCost
    });

    return replacementOrder;
  } catch (error) {
    console.error('Error creating replacement order:', error);
    throw error;
  }
}

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
