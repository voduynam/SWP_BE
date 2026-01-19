const asyncHandler = require('../utils/asyncHandler');
const GoodsReceipt = require('../models/GoodsReceipt');
const GoodsReceiptLine = require('../models/GoodsReceiptLine');
const Shipment = require('../models/Shipment');
const OrderFulfillment = require('../models/OrderFulfillment');
const InventoryBalance = require('../models/InventoryBalance');
const InventoryTransaction = require('../models/InventoryTransaction');
const ApiResponse = require('../utils/ApiResponse');

// @desc    Get all goods receipts
// @route   GET /api/goods-receipts
// @access  Private
exports.getGoodsReceipts = asyncHandler(async (req, res) => {
  const { status, shipment_id, start_date, end_date } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = {};
  if (status) filter.status = status;
  if (shipment_id) filter.shipment_id = shipment_id;
  if (start_date || end_date) {
    filter.received_date = {};
    if (start_date) filter.received_date.$gte = new Date(start_date);
    if (end_date) filter.received_date.$lte = new Date(end_date);
  }

  const receipts = await GoodsReceipt.find(filter)
    .populate('shipment_id', 'shipment_no ship_date')
    .populate('received_by', 'username full_name')
    .skip(skip)
    .limit(limit)
    .sort({ received_date: -1 });

  const total = await GoodsReceipt.countDocuments(filter);

  return res.status(200).json(
    ApiResponse.paginate(receipts, page, limit, total)
  );
});

// @desc    Get single goods receipt with lines
// @route   GET /api/goods-receipts/:id
// @access  Private
exports.getGoodsReceipt = asyncHandler(async (req, res) => {
  const receipt = await GoodsReceipt.findById(req.params.id)
    .populate('shipment_id', 'shipment_no ship_date status')
    .populate('received_by', 'username full_name');

  if (!receipt) {
    return res.status(404).json(
      ApiResponse.error('Goods receipt not found', 404)
    );
  }

  const receiptLines = await GoodsReceiptLine.find({ receipt_id: receipt._id })
    .populate('item_id', 'sku name item_type')
    .populate('shipment_line_id', 'qty');

  return res.status(200).json(
    ApiResponse.success({
      ...receipt.toObject(),
      lines: receiptLines
    })
  );
});

// @desc    Create goods receipt from shipment
// @route   POST /api/goods-receipts
// @access  Private (Store Staff, Manager, Admin)
exports.createGoodsReceipt = asyncHandler(async (req, res) => {
  const { shipment_id, received_date, lines } = req.body;

  // Verify shipment exists
  const shipment = await Shipment.findById(shipment_id);
  if (!shipment) {
    return res.status(404).json(
      ApiResponse.error('Shipment not found', 404)
    );
  }

  if (shipment.status !== 'SHIPPED' && shipment.status !== 'IN_TRANSIT') {
    return res.status(400).json(
      ApiResponse.error('Shipment must be shipped or in transit to receive', 400)
    );
  }

  if (!lines || lines.length === 0) {
    return res.status(400).json(
      ApiResponse.error('Receipt must have at least one line', 400)
    );
  }

  // Generate receipt number
  const receiptCount = await GoodsReceipt.countDocuments();
  const receiptNo = `GR-${String(receiptCount + 1).padStart(4, '0')}`;

  // Create goods receipt
  const receipt = await GoodsReceipt.create({
    _id: `gr_${Date.now()}`,
    receipt_no: receiptNo,
    shipment_id,
    received_date: received_date || new Date(),
    status: 'DRAFT',
    received_by: req.user.id
  });

  // Create receipt lines
  const receiptLines = await Promise.all(
    lines.map(async (line, index) => {
      const receiptLine = await GoodsReceiptLine.create({
        _id: `gr_line_${receipt._id}_${index}`,
        receipt_id: receipt._id,
        shipment_line_id: line.shipment_line_id,
        item_id: line.item_id,
        qty_received: line.qty_received || 0,
        qty_rejected: line.qty_rejected || 0
      });

      // Update order fulfillment
      const shipmentLine = await require('../models/ShipmentLine').findById(line.shipment_line_id);
      if (shipmentLine && shipmentLine.order_line_id) {
        const fulfillment = await OrderFulfillment.findOne({ order_line_id: shipmentLine.order_line_id });
        if (fulfillment) {
          fulfillment.qty_received_total += line.qty_received || 0;
          await fulfillment.save();
        }
      }

      return receiptLine;
    })
  );

  const populatedReceipt = await GoodsReceipt.findById(receipt._id)
    .populate('shipment_id', 'shipment_no ship_date')
    .populate('received_by', 'username full_name');

  return res.status(201).json(
    ApiResponse.success({
      ...populatedReceipt.toObject(),
      lines: receiptLines
    }, 'Goods receipt created successfully', 201)
  );
});

// @desc    Confirm goods receipt (update inventory)
// @route   PUT /api/goods-receipts/:id/confirm
// @access  Private (Store Staff, Manager, Admin)
exports.confirmGoodsReceipt = asyncHandler(async (req, res) => {
  const receipt = await GoodsReceipt.findById(req.params.id);
  if (!receipt) {
    return res.status(404).json(
      ApiResponse.error('Goods receipt not found', 404)
    );
  }

  if (receipt.status === 'RECEIVED') {
    return res.status(400).json(
      ApiResponse.error('Receipt already confirmed', 400)
    );
  }

  const receiptLines = await GoodsReceiptLine.find({ receipt_id: receipt._id })
    .populate('item_id')
    .populate('shipment_line_id');

  const shipment = await Shipment.findById(receipt.shipment_id);

  // Process each line and update inventory
  for (const line of receiptLines) {
    if (line.qty_received > 0) {
      // Get lot from shipment line lot if exists
      const shipmentLineLot = await require('../models/ShipmentLineLot').findOne({
        shipment_line_id: line.shipment_line_id._id
      });

      // Update inventory balance
      const balanceFilter = {
        location_id: shipment.to_location_id,
        item_id: line.item_id._id,
        lot_id: shipmentLineLot ? shipmentLineLot.lot_id : null
      };

      let balance = await InventoryBalance.findOne(balanceFilter);
      if (!balance) {
        balance = await InventoryBalance.create({
          location_id: shipment.to_location_id,
          item_id: line.item_id._id,
          lot_id: shipmentLineLot ? shipmentLineLot.lot_id : null,
          qty_on_hand: 0,
          qty_reserved: 0
        });
      }

      balance.qty_on_hand += line.qty_received;
      balance.updated_at = new Date();
      await balance.save();

      // Create inventory transaction
      await InventoryTransaction.create({
        txn_time: new Date(),
        location_id: shipment.to_location_id,
        item_id: line.item_id._id,
        lot_id: shipmentLineLot ? shipmentLineLot.lot_id : null,
        qty: line.qty_received,
        uom_id: line.item_id.base_uom_id,
        txn_type: 'TRANSFER_IN',
        ref_type: 'GOODS_RECEIPT',
        ref_id: receipt._id,
        created_by: req.user.id
      });
    }
  }

  // Update receipt status
  receipt.status = 'RECEIVED';
  receipt.updated_at = new Date();
  await receipt.save();

  // Update shipment status
  shipment.status = 'DELIVERED';
  await shipment.save();

  // Update order status
  const order = await InternalOrder.findById(shipment.order_id);
  if (order) {
    order.status = 'RECEIVED';
    await order.save();
  }

  const populatedReceipt = await GoodsReceipt.findById(receipt._id)
    .populate('shipment_id', 'shipment_no ship_date')
    .populate('received_by', 'username full_name');

  return res.status(200).json(
    ApiResponse.success(populatedReceipt, 'Goods receipt confirmed and inventory updated')
  );
});
