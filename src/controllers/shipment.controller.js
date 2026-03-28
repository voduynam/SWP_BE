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

  // DRIVERS: chỉ được xem shipment thuộc các delivery routes được phân cho họ.
  // Nếu user có quyền cấp cao (ADMIN/MANAGER/CHEF/SUPPLY_COORDINATOR) thì không áp dụng lọc theo driver.
  const roles = req.user?.roles || [];
  const isDriverOnly = roles.includes('DRIVER') && !(
    roles.includes('ADMIN') ||
    roles.includes('MANAGER') ||
    roles.includes('CHEF') ||
    roles.includes('SUPPLY_COORDINATOR')
  );
  if (isDriverOnly) {
    const AppUser = require('../models/AppUser');
    const DeliveryRoute = require('../models/DeliveryRoute');
    const RouteStop = require('../models/RouteStop');

    const user = await AppUser.findById(req.user.id).select('full_name username');
    const driverName = user?.full_name || user?.username;

    // Tìm các route của driver hiện tại → lấy shipment_ids từ stops
    const routes = await DeliveryRoute.find({ driver_name: driverName }).select('_id');
    const routeIds = routes.map(r => r._id);

    const stops = routeIds.length
      ? await RouteStop.find({ route_id: { $in: routeIds } }).select('shipment_ids')
      : [];

    const shipmentIds = new Set();
    for (const stop of stops) {
      for (const s of stop.shipment_ids || []) {
        shipmentIds.add(String(s));
      }
    }

    filter._id = { $in: Array.from(shipmentIds) };
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
  // DRIVERS: chỉ được xem shipment của chính họ
  const roles = req.user?.roles || [];
  const isDriverOnly = roles.includes('DRIVER') && !(
    roles.includes('ADMIN') ||
    roles.includes('MANAGER') ||
    roles.includes('CHEF') ||
    roles.includes('SUPPLY_COORDINATOR')
  );
  if (isDriverOnly) {
    const AppUser = require('../models/AppUser');
    const DeliveryRoute = require('../models/DeliveryRoute');
    const RouteStop = require('../models/RouteStop');

    const user = await AppUser.findById(req.user.id).select('full_name username');
    const driverName = user?.full_name || user?.username;

    const stop = await RouteStop.findOne({ shipment_ids: req.params.id }).select('route_id');
    if (!stop) {
      return res.status(403).json(ApiResponse.error('Access denied', 403));
    }
    const route = await DeliveryRoute.findById(stop.route_id).select('driver_name');
    if (!route || route.driver_name !== driverName) {
      return res.status(403).json(ApiResponse.error('Access denied', 403));
    }
  }

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

  // Set COD amount if order uses COD payment
  const codAmount = order.payment_method === 'COD' ? order.total_amount : 0;

  // Create shipment
  const shipment = await Shipment.create({
    _id: `ship_${Date.now()}`,
    shipment_no: shipmentNo,
    order_id,
    from_location_id,
    to_location_id,
    ship_date: ship_date || new Date(),
    status: 'DRAFT',
    created_by: req.user.id,
    cod_amount: codAmount
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
    .populate('order_id', 'order_no order_date payment_method payment_status total_amount')
    .populate('from_location_id', 'name code')
    .populate('to_location_id', 'name code')
    .populate('created_by', 'username full_name');

  return res.status(201).json(
    ApiResponse.success({
      ...populatedShipment.toObject(),
      lines: shipmentLines
    }, `Shipment created successfully${codAmount > 0 ? ` with COD amount: ${codAmount.toLocaleString()} VND` : ''}`, 201)
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

  // DRIVERS: chỉ được cập nhật shipment thuộc các route của chính họ
  const roles = req.user?.roles || [];
  const isDriverOnly = roles.includes('DRIVER') && !(
    roles.includes('ADMIN') ||
    roles.includes('MANAGER') ||
    roles.includes('CHEF') ||
    roles.includes('SUPPLY_COORDINATOR')
  );
  if (isDriverOnly) {
    const AppUser = require('../models/AppUser');
    const DeliveryRoute = require('../models/DeliveryRoute');
    const RouteStop = require('../models/RouteStop');

    const user = await AppUser.findById(req.user.id).select('full_name username');
    const driverName = user?.full_name || user?.username;

    const stop = await RouteStop.findOne({ shipment_ids: shipment._id }).select('route_id');
    if (!stop) {
      return res.status(403).json(ApiResponse.error('Access denied', 403));
    }

    const route = await DeliveryRoute.findById(stop.route_id).select('driver_name');
    if (!route || route.driver_name !== driverName) {
      return res.status(403).json(ApiResponse.error('Access denied', 403));
    }
  }

  shipment.status = status;
  shipment.updated_at = new Date();

  // Handle delivery photo upload when status = DELIVERED
  if (status === 'DELIVERED' && req.file) {
    // multer-storage-cloudinary thường trả URL qua secure_url/url thay vì path
    shipment.delivery_photo_url =
      req.file.secure_url || req.file.url || req.file.path;
    shipment.delivery_photo_uploaded_at = new Date();
  }

  // Set receipt status to PENDING_RECEIPT when delivered
  if (status === 'DELIVERED') {
    shipment.receipt_status = 'PENDING_RECEIPT';
    shipment.staff_notified_at = new Date();
  }

  await shipment.save();

  // --- [WORKFLOW SYNC] ---
  // When driver marks shipment as DELIVERED, the destination store should be
  // able to "receive" the order (create/confirm goods receipt).
  // Existing FE logic expects internal order status = SHIPPED before receiving.
  if (status === 'DELIVERED') {
    const order = await InternalOrder.findById(shipment.order_id);
    if (order && order.status !== 'RECEIVED' && order.status !== 'CANCELLED') {
      order.status = 'SHIPPED';
      order.updated_at = new Date();
      await order.save();
    }

    // Notify staff to confirm receipt
    const notificationController = require('./notification.controller');
    await notificationController.createNotificationInternal({
      recipient_role: 'STORE_STAFF',
      recipient_id: order ? order.created_by : null,
      title: 'Hàng đã được giao',
      message: `Chuyến hàng ${shipment.shipment_no} đã được giao đến. Vui lòng xác nhận đã nhận hàng.`,
      type: 'INFO',
      ref_type: 'SHIPMENT',
      ref_id: shipment._id
    });
  }

  const populatedShipment = await Shipment.findById(shipment._id)
    .populate('order_id', 'order_no order_date')
    .populate('from_location_id', 'name code')
    .populate('to_location_id', 'name code')
    .populate('created_by', 'username full_name');

  return res.status(200).json(
    ApiResponse.success(populatedShipment, 'Shipment status updated successfully')
  );
});

// @desc    Confirm shipment dispatch (Deduct stock from CK)
// @route   PUT /api/shipments/:id/dispatch
// @access  Private (Kitchen Staff, Manager, Admin)
exports.confirmDispatch = asyncHandler(async (req, res) => {
  const shipment = await Shipment.findById(req.params.id);
  if (!shipment) {
    return res.status(404).json(
      ApiResponse.error('Shipment not found', 404)
    );
  }

  if (shipment.status === 'SHIPPED' || shipment.status === 'IN_TRANSIT' || shipment.status === 'DELIVERED') {
    return res.status(400).json(
      ApiResponse.error('Shipment already dispatched', 400)
    );
  }

  const shipmentLines = await ShipmentLine.find({ shipment_id: shipment._id });
  const InventoryBalance = require('../models/InventoryBalance');
  const InventoryTransaction = require('../models/InventoryTransaction');

  // Loop through lines and associated lots to deduct stock
  for (const line of shipmentLines) {
    const shipmentLineLots = await ShipmentLineLot.find({ shipment_line_id: line._id });

    // If no lots are assigned, we use the base item balance (assuming tracking_type is NONE)
    if (shipmentLineLots.length === 0) {
      let balance = await InventoryBalance.findOne({
        location_id: shipment.from_location_id,
        item_id: line.item_id,
        lot_id: null
      });

      if (!balance || balance.qty_on_hand < line.qty) {
        return res.status(400).json(
          ApiResponse.error(`Insufficient stock for item ${line.item_id} at source location`, 400)
        );
      }

      balance.qty_on_hand -= line.qty;
      await balance.save();

      // Record transaction
      await InventoryTransaction.create({
        txn_time: new Date(),
        location_id: shipment.from_location_id,
        item_id: line.item_id,
        lot_id: null,
        qty: -line.qty,
        uom_id: line.uom_id,
        txn_type: 'TRANSFER_OUT',
        ref_type: 'SHIPMENT',
        ref_id: shipment._id,
        created_by: req.user.id
      });
    } else {
      for (const lineLot of shipmentLineLots) {
        let balance = await InventoryBalance.findOne({
          location_id: shipment.from_location_id,
          item_id: line.item_id,
          lot_id: lineLot.lot_id
        });

        if (!balance || balance.qty_on_hand < lineLot.qty) {
          return res.status(400).json(
            ApiResponse.error(`Insufficient stock for item ${line.item_id} (Lot: ${lineLot.lot_id}) at source location`, 400)
          );
        }

        balance.qty_on_hand -= lineLot.qty;
        await balance.save();

        // Record transaction
        await InventoryTransaction.create({
          txn_time: new Date(),
          location_id: shipment.from_location_id,
          item_id: line.item_id,
          lot_id: lineLot.lot_id,
          qty: -lineLot.qty,
          uom_id: line.uom_id,
          txn_type: 'TRANSFER_OUT',
          ref_type: 'SHIPMENT',
          ref_id: shipment._id,
          created_by: req.user.id
        });
      }
    }
  }

  // Update status
  shipment.status = 'SHIPPED';
  shipment.updated_at = new Date();
  await shipment.save();

  // Also update order status if it was PROCESSING
  const InternalOrder = require('../models/InternalOrder');
  const order = await InternalOrder.findById(shipment.order_id);
  if (order && order.status === 'PROCESSING') {
    order.status = 'SHIPPED';
    await order.save();
  }

  // --- [NOTIFICATION TRIGGER] ---
  const notificationController = require('./notification.controller');
  await notificationController.createNotificationInternal({
    recipient_role: 'STORE_STAFF',
    recipient_id: order ? order.created_by : null,
    title: 'Hàng đã xuất kho',
    message: `Chuyến hàng ${shipment.shipment_no} đã được xác nhận xuất kho và đang được giao đến bạn.`,
    type: 'SUCCESS',
    ref_type: 'SHIPMENT',
    ref_id: shipment._id
  });

  return res.status(200).json(
    ApiResponse.success(populatedShipment, 'Shipment dispatched and CK stock deducted')
  );
});

// @desc    Collect COD payment (for drivers)
// @route   PUT /api/shipments/:id/collect-cod
// @access  Private (Driver, Manager, Admin)
exports.collectCOD = asyncHandler(async (req, res) => {
  const { collected_amount, notes } = req.body;
  
  const shipment = await Shipment.findById(req.params.id)
    .populate('order_id', 'order_no payment_method payment_status total_amount');
    
  if (!shipment) {
    return res.status(404).json(
      ApiResponse.error('Shipment not found', 404)
    );
  }

  // Check if this is a COD shipment
  if (shipment.cod_amount === 0) {
    return res.status(400).json(
      ApiResponse.error('This shipment does not require COD payment', 400)
    );
  }

  // Check if already collected
  if (shipment.cod_collected_amount > 0) {
    return res.status(400).json(
      ApiResponse.error('COD payment already collected for this shipment', 400)
    );
  }

  // DRIVER: chỉ được collect COD cho shipment thuộc routes của mình
  const roles = req.user?.roles || [];
  const isDriverOnly = roles.includes('DRIVER') && !(
    roles.includes('ADMIN') ||
    roles.includes('MANAGER') ||
    roles.includes('CHEF') ||
    roles.includes('SUPPLY_COORDINATOR')
  );
  if (isDriverOnly) {
    const AppUser = require('../models/AppUser');
    const DeliveryRoute = require('../models/DeliveryRoute');
    const RouteStop = require('../models/RouteStop');

    const user = await AppUser.findById(req.user.id).select('full_name username');
    const driverName = user?.full_name || user?.username;

    const stop = await RouteStop.findOne({ shipment_ids: shipment._id }).select('route_id');
    if (!stop) {
      return res.status(403).json(ApiResponse.error('Access denied', 403));
    }

    const route = await DeliveryRoute.findById(stop.route_id).select('driver_name');
    if (!route || route.driver_name !== driverName) {
      return res.status(403).json(ApiResponse.error('Access denied', 403));
    }
  }

  // Validate collected amount
  if (!collected_amount || collected_amount < 0) {
    return res.status(400).json(
      ApiResponse.error('Collected amount must be provided and greater than 0', 400)
    );
  }

  // Update shipment with COD collection info
  shipment.cod_collected_amount = collected_amount;
  shipment.cod_collected_at = new Date();
  shipment.cod_collected_by = req.user.id;
  await shipment.save();

  // Create payment record with COD_COLLECTED status
  const Payment = require('../models/Payment');
  const paymentCount = await Payment.countDocuments();
  const paymentNo = `COD-${String(paymentCount + 1).padStart(4, '0')}`;

  const payment = await Payment.create({
    _id: `pay_cod_${Date.now()}`,
    payment_no: paymentNo,
    order_id: shipment.order_id._id,
    amount: collected_amount,
    currency: 'VND',
    payment_method: 'COD',
    payment_type: 'CASH',
    payment_status: 'COD_COLLECTED',
    description: `COD payment collected by driver for shipment ${shipment.shipment_no}`,
    created_by: req.user.id,
    metadata: {
      shipment_id: shipment._id,
      expected_amount: shipment.cod_amount,
      collected_amount: collected_amount,
      notes: notes || ''
    }
  });

  // Update order payment status
  const InternalOrder = require('../models/InternalOrder');
  const order = await InternalOrder.findById(shipment.order_id._id);
  if (order) {
    order.payment_status = 'COD_COLLECTED';
    order.payment_id = payment._id;
    await order.save();
  }

  // --- [NOTIFICATION TRIGGER] ---
  const notificationController = require('./notification.controller');
  await notificationController.createNotificationInternal({
    recipient_role: 'MANAGER',
    title: 'COD đã thu',
    message: `Tài xế đã thu COD ${collected_amount.toLocaleString()} VND cho đơn hàng ${shipment.order_id.order_no}. Cần xác nhận.`,
    type: 'INFO',
    ref_type: 'ORDER',
    ref_id: payment._id
  });

  const populatedShipment = await Shipment.findById(shipment._id)
    .populate('order_id', 'order_no payment_method payment_status')
    .populate('cod_collected_by', 'username full_name');

  return res.status(200).json(
    ApiResponse.success({
      shipment: populatedShipment,
      payment: payment,
      cod_summary: {
        expected_amount: shipment.cod_amount,
        collected_amount: collected_amount,
        difference: collected_amount - shipment.cod_amount,
        status: 'COLLECTED_PENDING_CONFIRMATION'
      }
    }, 'COD payment collected successfully. Waiting for manager confirmation.')
  );
});

// @desc    Staff confirm receipt of shipment
// @route   PUT /api/shipments/:id/confirm-receipt
// @access  Private (Store Staff, Manager, Admin)
exports.confirmReceipt = asyncHandler(async (req, res) => {
  const { receipt_status, receipt_notes, delivery_discrepancy } = req.body;
  
  const shipment = await Shipment.findById(req.params.id)
    .populate('order_id', 'order_no status')
    .populate('to_location_id', 'name code');
    
  if (!shipment) {
    return res.status(404).json(
      ApiResponse.error('Shipment not found', 404)
    );
  }

  // Check if shipment is delivered
  if (shipment.status !== 'DELIVERED') {
    return res.status(400).json(
      ApiResponse.error('Shipment must be delivered before staff can confirm receipt', 400)
    );
  }

  // Check if already confirmed
  if (shipment.receipt_status !== 'PENDING_RECEIPT') {
    return res.status(400).json(
      ApiResponse.error('Receipt already confirmed for this shipment', 400)
    );
  }

  // Validate receipt status
  const validReceiptStatuses = ['RECEIVED_OK', 'RECEIVED_WITH_ISSUES', 'NOT_RECEIVED'];
  if (!validReceiptStatuses.includes(receipt_status)) {
    return res.status(400).json(
      ApiResponse.error('Invalid receipt status', 400)
    );
  }

  // Update shipment with receipt confirmation
  shipment.received_by_staff = req.user.id;
  shipment.received_at = new Date();
  shipment.receipt_status = receipt_status;
  shipment.receipt_notes = receipt_notes || '';
  shipment.delivery_discrepancy = delivery_discrepancy || '';
  await shipment.save();

  // Update internal order status based on receipt confirmation
  const order = await InternalOrder.findById(shipment.order_id._id);
  if (order) {
    if (receipt_status === 'RECEIVED_OK') {
      order.status = 'RECEIVED';
    } else if (receipt_status === 'RECEIVED_WITH_ISSUES') {
      order.status = 'RECEIVED'; // Still received but with issues noted
    }
    // For NOT_RECEIVED, keep order status as SHIPPED for investigation
    await order.save();
  }

  // Create notifications based on receipt status
  const notificationController = require('./notification.controller');
  
  if (receipt_status === 'RECEIVED_OK') {
    await notificationController.createNotificationInternal({
      recipient_role: 'MANAGER',
      title: 'Xác nhận nhận hàng',
      message: `Nhân viên đã xác nhận nhận hàng thành công cho chuyến hàng ${shipment.shipment_no}`,
      type: 'SUCCESS',
      ref_type: 'SHIPMENT',
      ref_id: shipment._id
    });
  } else if (receipt_status === 'RECEIVED_WITH_ISSUES') {
    await notificationController.createNotificationInternal({
      recipient_role: 'MANAGER',
      title: 'Nhận hàng có vấn đề',
      message: `Nhân viên báo cáo vấn đề khi nhận hàng ${shipment.shipment_no}: ${delivery_discrepancy}`,
      type: 'URGENT',
      ref_type: 'SHIPMENT',
      ref_id: shipment._id
    });
  } else if (receipt_status === 'NOT_RECEIVED') {
    await notificationController.createNotificationInternal({
      recipient_role: 'MANAGER',
      title: 'Chưa nhận được hàng',
      message: `Nhân viên xác nhận CHƯA nhận được hàng ${shipment.shipment_no}. Cần kiểm tra ngay!`,
      type: 'URGENT',
      ref_type: 'SHIPMENT',
      ref_id: shipment._id
    });
  }

  const populatedShipment = await Shipment.findById(shipment._id)
    .populate('order_id', 'order_no status')
    .populate('received_by_staff', 'username full_name')
    .populate('to_location_id', 'name code');

  return res.status(200).json(
    ApiResponse.success(populatedShipment, 'Receipt confirmation recorded successfully')
  );
});

// @desc    Check pending receipts and send notifications
// @route   GET /api/shipments/check-pending-receipts
// @access  Private (System/Manager)
exports.checkPendingReceipts = asyncHandler(async (req, res) => {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

  // Find shipments delivered but not yet confirmed by staff
  const pendingShipments = await Shipment.find({
    status: 'DELIVERED',
    receipt_status: 'PENDING_RECEIPT',
    delivery_photo_uploaded_at: { $exists: true, $ne: null }
  }).populate('order_id', 'order_no created_by')
    .populate('to_location_id', 'name code');

  let remindersSent = 0;
  let escalationsSent = 0;

  for (const shipment of pendingShipments) {
    const deliveredAt = shipment.delivery_photo_uploaded_at;
    
    // Send 1-hour reminder if not already sent
    if (deliveredAt <= oneHourAgo && !shipment.staff_reminder_sent_at) {
      const notificationController = require('./notification.controller');
      await notificationController.createNotificationInternal({
        recipient_role: 'STORE_STAFF',
        recipient_id: shipment.order_id.created_by,
        title: 'Nhắc nhở xác nhận nhận hàng',
        message: `Vui lòng xác nhận đã nhận hàng cho chuyến hàng ${shipment.shipment_no}. Hàng đã được giao 1 giờ trước.`,
        type: 'INFO',
        ref_type: 'SHIPMENT',
        ref_id: shipment._id
      });

      shipment.staff_reminder_sent_at = now;
      await shipment.save();
      remindersSent++;
    }

    // Send 24-hour escalation if not already sent
    if (deliveredAt <= twentyFourHoursAgo && !shipment.manager_escalated_at) {
      const notificationController = require('./notification.controller');
      await notificationController.createNotificationInternal({
        recipient_role: 'MANAGER',
        title: 'Cảnh báo: Chưa xác nhận nhận hàng',
        message: `Nhân viên chưa xác nhận nhận hàng ${shipment.shipment_no} sau 24 giờ giao hàng. Cần kiểm tra ngay!`,
        type: 'URGENT',
        ref_type: 'SHIPMENT',
        ref_id: shipment._id
      });

      shipment.manager_escalated_at = now;
      await shipment.save();
      escalationsSent++;
    }
  }

  return res.status(200).json(
    ApiResponse.success({
      total_pending: pendingShipments.length,
      reminders_sent: remindersSent,
      escalations_sent: escalationsSent,
      checked_at: now
    }, 'Pending receipts check completed')
  );
});
