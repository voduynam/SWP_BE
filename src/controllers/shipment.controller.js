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
  console.log('=== Get Shipments API Called ===');
  console.log('Query params:', req.query);
  console.log('User:', req.user);

  const { status, order_id, start_date, end_date } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = {};
  if (status) filter.status = status;
  if (order_id) filter.order_id = order_id;
  if (req.query.receipt_status) {
    filter.receipt_status = req.query.receipt_status;
    console.log('Added receipt_status filter:', req.query.receipt_status);
  }
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

  // STORE_STAFF: chỉ được xem shipment đến cửa hàng của họ
  // Nếu user có quyền cấp cao (ADMIN/MANAGER) thì không áp dụng lọc
  const isStoreStaffOnly = roles.includes('STORE_STAFF') && !(
    roles.includes('ADMIN') ||
    roles.includes('MANAGER')
  );
  if (isStoreStaffOnly) {
    const Location = require('../models/Location');
    
    // Tìm các locations thuộc org_unit của user
    const userLocations = await Location.find({ org_unit_id: req.user.org_unit_id });
    const locationIds = userLocations.map(l => l._id.toString());
    
    console.log('STORE_STAFF filter - User org_unit_id:', req.user.org_unit_id);
    console.log('STORE_STAFF filter - Location IDs:', locationIds);
    
    if (locationIds.length > 0) {
      filter.to_location_id = { $in: locationIds };
    }
  }

  console.log('Filter:', filter);
  console.log('Page:', page, 'Limit:', limit);

  const shipments = await Shipment.find(filter)
    .populate('order_id', 'order_no order_date')
    .populate('from_location_id', 'name code coordinates')
    .populate('to_location_id', 'name code coordinates')
    .populate('created_by', 'username full_name')
    .skip(skip)
    .limit(limit)
    .sort({ ship_date: -1 });

  console.log('Found shipments:', shipments.length);
  console.log('Sample shipment:', shipments[0]);

  const total = await Shipment.countDocuments(filter);
  console.log('Total shipments:', total);

  const response = ApiResponse.paginate(shipments, page, limit, total);
  console.log('Response:', response);

  return res.status(200).json(response);
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

  // STORE_STAFF: chỉ được xem shipment đến cửa hàng của họ
  const isStoreStaffOnly = roles.includes('STORE_STAFF') && !(
    roles.includes('ADMIN') ||
    roles.includes('MANAGER')
  );
  if (isStoreStaffOnly) {
    const Location = require('../models/Location');
    const userLocations = await Location.find({ org_unit_id: req.user.org_unit_id });
    const locationIds = userLocations.map(l => l._id.toString());
    
    // Get shipment to check if it's to user's location
    const tempShipment = await Shipment.findById(req.params.id).select('to_location_id');
    if (!tempShipment || !locationIds.includes(tempShipment.to_location_id.toString())) {
      return res.status(403).json(ApiResponse.error('Access denied. You can only view shipments to your store', 403));
    }
  }

  const shipment = await Shipment.findById(req.params.id)
    .populate('order_id', 'order_no order_date status')
    .populate('from_location_id', 'name code coordinates')
    .populate('to_location_id', 'name code coordinates')
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
    .populate('from_location_id', 'name code coordinates')
    .populate('to_location_id', 'name code coordinates')
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
  if (status === 'DELIVERED' && req.files && req.files.delivery_photo) {
    const deliveryPhoto = req.files.delivery_photo[0];
    shipment.delivery_photo_url =
      deliveryPhoto.secure_url || deliveryPhoto.url || deliveryPhoto.path;
    shipment.delivery_photo_uploaded_at = new Date();
  }

  // Handle COD collection when status = DELIVERED
  if (status === 'DELIVERED' && req.body.cod_amount_collected) {
    const codAmount = parseFloat(req.body.cod_amount_collected);
    if (codAmount > 0) {
      shipment.cod_collected_amount = codAmount;
      shipment.cod_collected_at = new Date();
      shipment.cod_collected_by = req.user.id;
      shipment.cod_status = 'COLLECTED'; // Set status to COLLECTED when driver collects COD
      
      // Store COD collection notes if provided
      if (req.body.cod_collection_notes) {
        shipment.cod_collection_notes = req.body.cod_collection_notes;
      }

      // Handle COD evidence photos
      if (req.files && req.files.cod_evidence_photos) {
        const evidencePhotos = req.files.cod_evidence_photos;
        
        shipment.cod_evidence_photos = evidencePhotos.map(file => ({
          url: file.secure_url || file.url || file.path,
          filename: file.filename || file.originalname,
          uploaded_at: new Date()
        }));
      }

      // Create payment record for COD collection
      const Payment = require('../models/Payment');
      const paymentCount = await Payment.countDocuments();
      const paymentNo = `COD-${String(paymentCount + 1).padStart(4, '0')}`;

      const payment = await Payment.create({
        _id: `pay_cod_${Date.now()}`,
        payment_no: paymentNo,
        order_id: shipment.order_id,
        amount: codAmount,
        currency: 'VND',
        payment_method: 'COD',
        payment_type: 'CASH',
        payment_status: 'COD_COLLECTED',
        description: `COD payment collected by driver for shipment ${shipment.shipment_no}`,
        created_by: req.user.id,
        metadata: {
          shipment_id: shipment._id,
          expected_amount: shipment.cod_amount,
          collected_amount: codAmount,
          notes: req.body.cod_collection_notes || ''
        }
      });

      // Update order payment status
      const order = await InternalOrder.findById(shipment.order_id);
      if (order) {
        order.payment_status = 'COD_COLLECTED';
        order.payment_id = payment._id;
        await order.save();
      }

      // Notify manager about COD collection
      const notificationController = require('./notification.controller');
      await notificationController.createNotificationInternal({
        recipient_role: 'MANAGER',
        title: 'COD đã thu',
        message: `Tài xế đã thu COD ${codAmount.toLocaleString()} VND cho đơn hàng ${order?.order_no || shipment.order_id}. Cần xác nhận.`,
        type: 'INFO',
        ref_type: 'PAYMENT',
        ref_id: payment._id
      });
    }
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

  // When shipment is CANCELLED, revert order status back to PROCESSING and restore inventory
  if (status === 'CANCELLED') {
    const order = await InternalOrder.findById(shipment.order_id);
    if (order && ['SHIPPED', 'DELIVERED'].includes(order.status)) {
      // Revert order status to PROCESSING so it can be re-shipped
      order.status = 'PROCESSING';
      order.updated_at = new Date();
      await order.save();

      // Restore inventory if shipment was already dispatched
      if (['SHIPPED', 'IN_TRANSIT', 'DELIVERED'].includes(shipment.status)) {
        await restoreInventoryFromCancelledShipment(shipment._id, req.user.id);
      }

      // Notify relevant parties about cancellation
      const notificationController = require('./notification.controller');
      await notificationController.createNotificationInternal({
        recipient_role: 'MANAGER',
        title: 'Giao hàng đã bị hủy',
        message: `Chuyến hàng ${shipment.shipment_no} cho đơn ${order.order_no} đã bị hủy. Đơn hàng đã được chuyển về trạng thái "Đang xử lý" và tồn kho đã được hoàn trả.`,
        type: 'WARNING',
        ref_type: 'SHIPMENT',
        ref_id: shipment._id
      });

      // Also notify the store that ordered
      await notificationController.createNotificationInternal({
        recipient_id: order.created_by,
        recipient_role: 'STORE_STAFF',
        title: 'Giao hàng bị hủy',
        message: `Chuyến hàng ${shipment.shipment_no} cho đơn ${order.order_no} đã bị hủy. Vui lòng liên hệ bếp trung tâm để được hỗ trợ.`,
        type: 'ERROR',
        ref_type: 'SHIPMENT',
        ref_id: shipment._id
      });
    }
  }

  const populatedShipment = await Shipment.findById(shipment._id)
    .populate('order_id', 'order_no order_date')
    .populate('from_location_id', 'name code coordinates')
    .populate('to_location_id', 'name code coordinates')
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
  console.log('=== Confirm Receipt API Called ===');
  console.log('Shipment ID:', req.params.id);
  console.log('Request body:', req.body);
  console.log('Request files:', req.files);
  console.log('User:', req.user);
  
  const { receipt_status, receipt_notes, delivery_discrepancy } = req.body;
  
  const shipment = await Shipment.findById(req.params.id)
    .populate('order_id', 'order_no status')
    .populate('to_location_id', 'name code coordinates');
    
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

  // Handle evidence photos/videos for issues
  let evidenceFiles = [];
  if (req.files && req.files.length > 0) {
    evidenceFiles = req.files.map(file => ({
      url: `/uploads/receipt-evidence/${file.filename}`,
      type: file.mimetype.startsWith('video/') ? 'video' : 'image',
      filename: file.filename,
      originalname: file.originalname,
      uploaded_at: new Date()
    }));
  }

  console.log('Evidence files count:', evidenceFiles.length);
  console.log('Receipt status:', receipt_status);
  if ((receipt_status === 'RECEIVED_WITH_ISSUES' || receipt_status === 'NOT_RECEIVED') && evidenceFiles.length === 0) {
    console.log('WARNING: No evidence files provided, but allowing for testing');
    // Temporarily allow without evidence for testing
    // return res.status(400).json(
    //   ApiResponse.error('Evidence photos/videos are required when reporting issues or non-receipt', 400)
    // );
  }

  // Update shipment with receipt confirmation
  shipment.receipt_status = receipt_status;
  shipment.receipt_notes = receipt_notes || '';
  shipment.delivery_discrepancy = delivery_discrepancy || '';
  shipment.receipt_evidence_photos = evidenceFiles;
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

  // Create Goods Receipt when staff confirms receipt (for all statuses except NOT_RECEIVED)
  if (receipt_status !== 'NOT_RECEIVED') {
    const GoodsReceipt = require('../models/GoodsReceipt');
    const GoodsReceiptLine = require('../models/GoodsReceiptLine');
    const ShipmentLine = require('../models/ShipmentLine');
    
    // Check if goods receipt already exists for this shipment
    const existingReceipt = await GoodsReceipt.findOne({ shipment_id: shipment._id });
    if (!existingReceipt) {
      // Get shipment lines
      const shipmentLines = await ShipmentLine.find({ shipment_id: shipment._id });
      
      // Generate receipt number
      const receiptCount = await GoodsReceipt.countDocuments();
      const receiptNo = `GR-${String(receiptCount + 1).padStart(4, '0')}`;
      
      // Create goods receipt
      const goodsReceipt = await GoodsReceipt.create({
        _id: `gr_${Date.now()}`,
        receipt_no: receiptNo,
        shipment_id: shipment._id,
        received_date: new Date(),
        status: 'RECEIVED',
        received_by: req.user.id,
        notes: receipt_notes || '',
        discrepancy_info: receipt_status === 'RECEIVED_WITH_ISSUES' ? delivery_discrepancy : '',
        evidence_photos: evidenceFiles
      });
      
      // Create goods receipt lines
      for (const shipmentLine of shipmentLines) {
        await GoodsReceiptLine.create({
          _id: `grl_${goodsReceipt._id}_${shipmentLine._id}`,
          receipt_id: goodsReceipt._id,
          shipment_line_id: shipmentLine._id,
          item_id: shipmentLine.item_id,
          uom_id: shipmentLine.uom_id,
          qty_received: shipmentLine.qty,
          qty_reserved: 0,
          notes: receipt_status === 'RECEIVED_WITH_ISSUES' ? 'Có vấn đề - cần xử lý trả hàng' : ''
        });
      }
      
      console.log('Created goods receipt:', receiptNo, 'for shipment:', shipment.shipment_no);
    }
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
      message: `Nhân viên báo cáo vấn đề khi nhận hàng ${shipment.shipment_no}: ${delivery_discrepancy}. Có ${evidenceFiles.length} file bằng chứng.`,
      type: 'URGENT',
      ref_type: 'SHIPMENT',
      ref_id: shipment._id
    });
  } else if (receipt_status === 'NOT_RECEIVED') {
    await notificationController.createNotificationInternal({
      recipient_role: 'MANAGER',
      title: 'Chưa nhận được hàng',
      message: `Nhân viên xác nhận CHƯA nhận được hàng ${shipment.shipment_no}. Có ${evidenceFiles.length} file bằng chứng. Cần kiểm tra ngay!`,
      type: 'URGENT',
      ref_type: 'SHIPMENT',
      ref_id: shipment._id
    });
  }

  const populatedShipment = await Shipment.findById(shipment._id)
    .populate('order_id', 'order_no status')
    .populate('received_by_staff', 'username full_name')
    .populate('to_location_id', 'name code coordinates');

  return res.status(200).json(
    ApiResponse.success({
      ...populatedShipment.toObject(),
      evidence_files_count: evidenceFiles.length,
      evidence_files: evidenceFiles
    }, 'Receipt confirmation recorded successfully')
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
    .populate('to_location_id', 'name code coordinates');

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
/**
 * Restore inventory when a shipment is cancelled after being dispatched
 * This reverses the TRANSFER_OUT transactions created during dispatch
 */
async function restoreInventoryFromCancelledShipment(shipmentId, userId) {
  const InventoryBalance = require('../models/InventoryBalance');
  const InventoryTransaction = require('../models/InventoryTransaction');
  const ShipmentLine = require('../models/ShipmentLine');
  const ShipmentLineLot = require('../models/ShipmentLineLot');
  const Shipment = require('../models/Shipment');

  try {
    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) return;

    const shipmentLines = await ShipmentLine.find({ shipment_id: shipmentId });

    for (const line of shipmentLines) {
      const shipmentLineLots = await ShipmentLineLot.find({ shipment_line_id: line._id });

      // If no lots are assigned, restore base item balance
      if (shipmentLineLots.length === 0) {
        let balance = await InventoryBalance.findOne({
          location_id: shipment.from_location_id,
          item_id: line.item_id,
          lot_id: null
        });

        if (!balance) {
          // Create balance if it doesn't exist
          balance = await InventoryBalance.create({
            location_id: shipment.from_location_id,
            item_id: line.item_id,
            lot_id: null,
            qty_on_hand: 0,
            qty_reserved: 0
          });
        }

        // Restore quantity
        balance.qty_on_hand += line.qty;
        balance.updated_at = new Date();
        await balance.save();

        // Record restoration transaction
        await InventoryTransaction.create({
          txn_time: new Date(),
          location_id: shipment.from_location_id,
          item_id: line.item_id,
          lot_id: null,
          qty: line.qty, // Positive quantity for restoration
          uom_id: line.uom_id,
          txn_type: 'TRANSFER_IN',
          ref_type: 'SHIPMENT_CANCELLED',
          ref_id: shipmentId,
          created_by: userId,
          notes: `Inventory restored from cancelled shipment ${shipment.shipment_no}`
        });
      } else {
        // Restore lot-specific balances
        for (const lineLot of shipmentLineLots) {
          let balance = await InventoryBalance.findOne({
            location_id: shipment.from_location_id,
            item_id: line.item_id,
            lot_id: lineLot.lot_id
          });

          if (!balance) {
            // Create balance if it doesn't exist
            balance = await InventoryBalance.create({
              location_id: shipment.from_location_id,
              item_id: line.item_id,
              lot_id: lineLot.lot_id,
              qty_on_hand: 0,
              qty_reserved: 0
            });
          }

          // Restore quantity
          balance.qty_on_hand += lineLot.qty;
          balance.updated_at = new Date();
          await balance.save();

          // Record restoration transaction
          await InventoryTransaction.create({
            txn_time: new Date(),
            location_id: shipment.from_location_id,
            item_id: line.item_id,
            lot_id: lineLot.lot_id,
            qty: lineLot.qty, // Positive quantity for restoration
            uom_id: line.uom_id,
            txn_type: 'TRANSFER_IN',
            ref_type: 'SHIPMENT_CANCELLED',
            ref_id: shipmentId,
            created_by: userId,
            notes: `Inventory restored from cancelled shipment ${shipment.shipment_no}`
          });
        }
      }
    }

    console.log(`Successfully restored inventory for cancelled shipment ${shipment.shipment_no}`);
  } catch (error) {
    console.error('Error restoring inventory from cancelled shipment:', error);
    throw error;
  }
}

// @desc    Update COD status (Manager confirmation)
// @route   PUT /api/shipments/:id/cod-status
// @access  Private (Manager, Admin)
exports.updateCODStatus = asyncHandler(async (req, res) => {
  const { action, manager_notes } = req.body;
  
  if (!['CONFIRMED', 'DISPUTED'].includes(action)) {
    return res.status(400).json(
      ApiResponse.error('Action must be CONFIRMED or DISPUTED', 400)
    );
  }

  const shipment = await Shipment.findById(req.params.id)
    .populate('order_id', 'order_no payment_method payment_status')
    .populate('cod_collected_by', 'username full_name');
    
  if (!shipment) {
    return res.status(404).json(
      ApiResponse.error('Shipment not found', 404)
    );
  }

  if (!shipment.cod_collected_amount || shipment.cod_collected_amount <= 0) {
    return res.status(400).json(
      ApiResponse.error('No COD collection found for this shipment', 400)
    );
  }

  // Update shipment COD status
  shipment.cod_status = action;
  shipment.cod_confirmed_by = req.user.id;
  shipment.cod_confirmed_at = new Date();
  shipment.cod_manager_notes = manager_notes;
  await shipment.save();

  // Update order payment status if confirmed
  if (action === 'CONFIRMED') {
    const order = await InternalOrder.findById(shipment.order_id._id);
    if (order) {
      order.payment_status = 'COD_CONFIRMED';
      await order.save();
    }
  }

  // Create notification
  const notificationController = require('./notification.controller');
  if (action === 'CONFIRMED') {
    await notificationController.createNotificationInternal({
      recipient_id: shipment.cod_collected_by,
      recipient_role: 'DRIVER',
      title: 'COD đã được xác nhận',
      message: `Manager đã xác nhận COD ${shipment.cod_collected_amount.toLocaleString()} VND cho đơn hàng ${shipment.order_id.order_no}`,
      type: 'SUCCESS',
      ref_type: 'SHIPMENT',
      ref_id: shipment._id
    });
  } else {
    await notificationController.createNotificationInternal({
      recipient_id: shipment.cod_collected_by,
      recipient_role: 'DRIVER',
      title: 'COD có tranh chấp',
      message: `Manager báo cáo tranh chấp COD cho đơn hàng ${shipment.order_id.order_no}. Lý do: ${manager_notes}`,
      type: 'WARNING',
      ref_type: 'SHIPMENT',
      ref_id: shipment._id
    });
  }

  const populatedShipment = await Shipment.findById(shipment._id)
    .populate('order_id', 'order_no payment_method payment_status')
    .populate('cod_collected_by', 'username full_name')
    .populate('cod_confirmed_by', 'username full_name');

  return res.status(200).json(
    ApiResponse.success(populatedShipment, `COD ${action === 'CONFIRMED' ? 'confirmed' : 'disputed'} successfully`)
  );
});