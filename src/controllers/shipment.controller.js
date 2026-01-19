const asyncHandler = require('../utils/asyncHandler');
const Shipment = require('../models/Shipment');
const ShipmentLine = require('../models/ShipmentLine');
const ShipmentLineLot = require('../models/ShipmentLineLot');
const InternalOrder = require('../models/InternalOrder');
const ApiResponse = require('../utils/ApiResponse');

// @desc    Get all shipments
// @route   GET /api/shipments
// @access  Private
exports.getShipments = asyncHandler(async (req, res) => {
  const { status, order_id, start_date, end_date } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = {};
  if (status) filter.status = status;
  if (order_id) filter.order_id = order_id;
  if (start_date || end_date) {
    filter.ship_date = {};
    if (start_date) filter.ship_date.$gte = new Date(start_date);
    if (end_date) filter.ship_date.$lte = new Date(end_date);
  }

  const shipments = await Shipment.find(filter)
    .populate('order_id', 'order_no order_date')
    .populate('from_location_id', 'name code')
    .populate('to_location_id', 'name code')
    .populate('created_by', 'username full_name')
    .skip(skip)
    .limit(limit)
    .sort({ ship_date: -1 });

  const total = await Shipment.countDocuments(filter);

  return res.status(200).json(
    ApiResponse.paginate(shipments, page, limit, total)
  );
});

// @desc    Get single shipment with lines
// @route   GET /api/shipments/:id
// @access  Private
exports.getShipment = asyncHandler(async (req, res) => {
  const shipment = await Shipment.findById(req.params.id)
    .populate('order_id', 'order_no order_date status')
    .populate('from_location_id', 'name code')
    .populate('to_location_id', 'name code')
    .populate('created_by', 'username full_name');

  if (!shipment) {
    return res.status(404).json(
      ApiResponse.error('Shipment not found', 404)
    );
  }

  const shipmentLines = await ShipmentLine.find({ shipment_id: shipment._id })
    .populate('item_id', 'sku name item_type')
    .populate('uom_id', 'code name')
    .populate('order_line_id', 'qty_ordered');

  // Get lot details for each line
  const linesWithLots = await Promise.all(
    shipmentLines.map(async (line) => {
      const lots = await ShipmentLineLot.find({ shipment_line_id: line._id })
        .populate('lot_id', 'lot_code mfg_date exp_date');
      return {
        ...line.toObject(),
        lots
      };
    })
  );

  return res.status(200).json(
    ApiResponse.success({
      ...shipment.toObject(),
      lines: linesWithLots
    })
  );
});

// @desc    Create shipment from order
// @route   POST /api/shipments
// @access  Private (Kitchen Staff, Manager, Admin)
exports.createShipment = asyncHandler(async (req, res) => {
  const { order_id, from_location_id, to_location_id, ship_date, lines } = req.body;

  // Verify order exists and is approved
  const order = await InternalOrder.findById(order_id);
  if (!order) {
    return res.status(404).json(
      ApiResponse.error('Order not found', 404)
    );
  }

  if (order.status !== 'APPROVED' && order.status !== 'PROCESSING') {
    return res.status(400).json(
      ApiResponse.error('Order must be approved or processing to create shipment', 400)
    );
  }

  if (!lines || lines.length === 0) {
    return res.status(400).json(
      ApiResponse.error('Shipment must have at least one line', 400)
    );
  }

  // Generate shipment number
  const shipmentCount = await Shipment.countDocuments();
  const shipmentNo = `SH-${String(shipmentCount + 1).padStart(4, '0')}`;

  // Create shipment
  const shipment = await Shipment.create({
    _id: `ship_${Date.now()}`,
    shipment_no: shipmentNo,
    order_id,
    from_location_id,
    to_location_id,
    ship_date: ship_date || new Date(),
    status: 'DRAFT',
    created_by: req.user.id
  });

  // Create shipment lines
  const shipmentLines = await Promise.all(
    lines.map(async (line, index) => {
      const shipmentLine = await ShipmentLine.create({
        _id: `ship_line_${shipment._id}_${index}`,
        shipment_id: shipment._id,
        item_id: line.item_id,
        qty: line.qty,
        uom_id: line.uom_id,
        order_line_id: line.order_line_id
      });

      // Create shipment line lots if provided
      if (line.lots && line.lots.length > 0) {
        await Promise.all(
          line.lots.map(async (lot) => {
            await ShipmentLineLot.create({
              shipment_line_id: shipmentLine._id,
              lot_id: lot.lot_id,
              qty: lot.qty
            });
          })
        );
      }

      return shipmentLine;
    })
  );

  // Update order status
  order.status = 'PROCESSING';
  await order.save();

  const populatedShipment = await Shipment.findById(shipment._id)
    .populate('order_id', 'order_no order_date')
    .populate('from_location_id', 'name code')
    .populate('to_location_id', 'name code')
    .populate('created_by', 'username full_name');

  return res.status(201).json(
    ApiResponse.success({
      ...populatedShipment.toObject(),
      lines: shipmentLines
    }, 'Shipment created successfully', 201)
  );
});

// @desc    Update shipment status
// @route   PUT /api/shipments/:id/status
// @access  Private
exports.updateShipmentStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['DRAFT', 'PICKED', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json(
      ApiResponse.error('Invalid status', 400)
    );
  }

  const shipment = await Shipment.findById(req.params.id);
  if (!shipment) {
    return res.status(404).json(
      ApiResponse.error('Shipment not found', 404)
    );
  }

  shipment.status = status;
  shipment.updated_at = new Date();
  await shipment.save();

  const populatedShipment = await Shipment.findById(shipment._id)
    .populate('order_id', 'order_no order_date')
    .populate('from_location_id', 'name code')
    .populate('to_location_id', 'name code')
    .populate('created_by', 'username full_name');

  return res.status(200).json(
    ApiResponse.success(populatedShipment, 'Shipment status updated successfully')
  );
});
