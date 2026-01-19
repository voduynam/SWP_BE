const asyncHandler = require('../utils/asyncHandler');
const InternalOrder = require('../models/InternalOrder');
const ProductionOrder = require('../models/ProductionOrder');
const Shipment = require('../models/Shipment');
const InventoryBalance = require('../models/InventoryBalance');
const InventoryTransaction = require('../models/InventoryTransaction');
const Location = require('../models/Location');
const ApiResponse = require('../utils/ApiResponse');

// @desc    Get dashboard overview
// @route   GET /api/dashboard/overview
// @access  Private
exports.getDashboardOverview = asyncHandler(async (req, res) => {
  const { start_date, end_date, org_unit_id } = req.query;
  
  const startDate = start_date ? new Date(start_date) : new Date(new Date().setDate(new Date().getDate() - 30));
  const endDate = end_date ? new Date(end_date) : new Date();

  // Build filter based on user role
  const orderFilter = { order_date: { $gte: startDate, $lte: endDate } };
  const prodFilter = { planned_start: { $gte: startDate, $lte: endDate } };
  const shipFilter = { ship_date: { $gte: startDate, $lte: endDate } };

  if (org_unit_id) {
    orderFilter.store_org_unit_id = org_unit_id;
  } else if (!req.user.roles.includes('ADMIN') && !req.user.roles.includes('MANAGER')) {
    orderFilter.store_org_unit_id = req.user.org_unit_id;
  }

  // Get counts and statistics
  const [
    totalOrders,
    pendingOrders,
    completedOrders,
    totalProduction,
    activeProduction,
    totalShipments,
    inTransitShipments
  ] = await Promise.all([
    InternalOrder.countDocuments(orderFilter),
    InternalOrder.countDocuments({ ...orderFilter, status: { $in: ['DRAFT', 'SUBMITTED'] } }),
    InternalOrder.countDocuments({ ...orderFilter, status: 'RECEIVED' }),
    ProductionOrder.countDocuments(prodFilter),
    ProductionOrder.countDocuments({ ...prodFilter, status: { $in: ['RELEASED', 'IN_PROGRESS'] } }),
    Shipment.countDocuments(shipFilter),
    Shipment.countDocuments({ ...shipFilter, status: { $in: ['SHIPPED', 'IN_TRANSIT'] } })
  ]);

  // Get inventory value
  let inventoryFilter = {};
  if (org_unit_id) {
    const locations = await Location.find({ org_unit_id });
    inventoryFilter.location_id = { $in: locations.map(l => l._id) };
  } else if (!req.user.roles.includes('ADMIN') && !req.user.roles.includes('MANAGER')) {
    const locations = await Location.find({ org_unit_id: req.user.org_unit_id });
    inventoryFilter.location_id = { $in: locations.map(l => l._id) };
  }

  const inventoryBalances = await InventoryBalance.find(inventoryFilter)
    .populate('item_id', 'cost_price');

  const totalInventoryValue = inventoryBalances.reduce((sum, balance) => {
    return sum + (balance.qty_on_hand * (balance.item_id.cost_price || 0));
  }, 0);

  const totalInventoryItems = inventoryBalances.length;

  return res.status(200).json(
    ApiResponse.success({
      period: { start_date: startDate, end_date: endDate },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        completed: completedOrders,
        completion_rate: totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(2) : 0
      },
      production: {
        total: totalProduction,
        active: activeProduction
      },
      shipments: {
        total: totalShipments,
        in_transit: inTransitShipments
      },
      inventory: {
        total_value: totalInventoryValue,
        total_items: totalInventoryItems
      }
    })
  );
});

// @desc    Get order statistics
// @route   GET /api/dashboard/orders
// @access  Private
exports.getOrderStatistics = asyncHandler(async (req, res) => {
  const { start_date, end_date, org_unit_id, group_by } = req.query;
  
  const startDate = start_date ? new Date(start_date) : new Date(new Date().setDate(new Date().getDate() - 30));
  const endDate = end_date ? new Date(end_date) : new Date();
  const groupBy = group_by || 'day'; // day, week, month

  const filter = { order_date: { $gte: startDate, $lte: endDate } };
  
  if (org_unit_id) {
    filter.store_org_unit_id = org_unit_id;
  } else if (!req.user.roles.includes('ADMIN') && !req.user.roles.includes('MANAGER')) {
    filter.store_org_unit_id = req.user.org_unit_id;
  }

  // Get orders by status
  const ordersByStatus = await InternalOrder.aggregate([
    { $match: filter },
    { $group: { _id: '$status', count: { $sum: 1 }, total_amount: { $sum: '$total_amount' } } }
  ]);

  // Get orders trend
  let dateFormat;
  switch (groupBy) {
    case 'week':
      dateFormat = { $week: '$order_date' };
      break;
    case 'month':
      dateFormat = { $month: '$order_date' };
      break;
    default:
      dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$order_date' } };
  }

  const ordersTrend = await InternalOrder.aggregate([
    { $match: filter },
    {
      $group: {
        _id: dateFormat,
        count: { $sum: 1 },
        total_amount: { $sum: '$total_amount' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Get top stores by order count
  const topStores = await InternalOrder.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$store_org_unit_id',
        order_count: { $sum: 1 },
        total_amount: { $sum: '$total_amount' }
      }
    },
    { $sort: { order_count: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'org_unit',
        localField: '_id',
        foreignField: '_id',
        as: 'store'
      }
    },
    { $unwind: '$store' }
  ]);

  return res.status(200).json(
    ApiResponse.success({
      period: { start_date: startDate, end_date: endDate },
      by_status: ordersByStatus,
      trend: ordersTrend,
      top_stores: topStores
    })
  );
});

// @desc    Get production statistics
// @route   GET /api/dashboard/production
// @access  Private
exports.getProductionStatistics = asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;
  
  const startDate = start_date ? new Date(start_date) : new Date(new Date().setDate(new Date().getDate() - 30));
  const endDate = end_date ? new Date(end_date) : new Date();

  const filter = { planned_start: { $gte: startDate, $lte: endDate } };

  // Get production by status
  const productionByStatus = await ProductionOrder.aggregate([
    { $match: filter },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  // Get production efficiency (actual vs planned)
  const ProductionOrderLine = require('../models/ProductionOrderLine');
  const productionLines = await ProductionOrderLine.find({})
    .populate({
      path: 'prod_order_id',
      match: filter
    });

  const filteredLines = productionLines.filter(line => line.prod_order_id);
  
  const totalPlanned = filteredLines.reduce((sum, line) => sum + line.planned_qty, 0);
  const totalActual = filteredLines.reduce((sum, line) => sum + line.actual_qty, 0);
  const efficiency = totalPlanned > 0 ? ((totalActual / totalPlanned) * 100).toFixed(2) : 0;

  // Get production trend
  const productionTrend = await ProductionOrder.aggregate([
    { $match: filter },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$planned_start' } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  return res.status(200).json(
    ApiResponse.success({
      period: { start_date: startDate, end_date: endDate },
      by_status: productionByStatus,
      efficiency: {
        total_planned: totalPlanned,
        total_actual: totalActual,
        efficiency_rate: efficiency
      },
      trend: productionTrend
    })
  );
});

// @desc    Get inventory statistics
// @route   GET /api/dashboard/inventory
// @access  Private
exports.getInventoryStatistics = asyncHandler(async (req, res) => {
  const { location_id, org_unit_id } = req.query;

  let filter = {};
  if (location_id) {
    filter.location_id = location_id;
  } else if (org_unit_id) {
    const locations = await Location.find({ org_unit_id });
    filter.location_id = { $in: locations.map(l => l._id) };
  } else if (!req.user.roles.includes('ADMIN') && !req.user.roles.includes('MANAGER')) {
    const locations = await Location.find({ org_unit_id: req.user.org_unit_id });
    filter.location_id = { $in: locations.map(l => l._id) };
  }

  // Get inventory by location
  const inventoryByLocation = await InventoryBalance.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$location_id',
        total_items: { $sum: 1 },
        total_qty: { $sum: '$qty_on_hand' }
      }
    },
    {
      $lookup: {
        from: 'location',
        localField: '_id',
        foreignField: '_id',
        as: 'location'
      }
    },
    { $unwind: '$location' }
  ]);

  // Get inventory by item type
  const inventoryByType = await InventoryBalance.aggregate([
    { $match: filter },
    {
      $lookup: {
        from: 'item',
        localField: 'item_id',
        foreignField: '_id',
        as: 'item'
      }
    },
    { $unwind: '$item' },
    {
      $group: {
        _id: '$item.item_type',
        total_items: { $sum: 1 },
        total_qty: { $sum: '$qty_on_hand' }
      }
    }
  ]);

  // Get recent transactions
  const txnFilter = { ...filter, txn_time: { $gte: new Date(new Date().setDate(new Date().getDate() - 7)) } };
  const recentTransactions = await InventoryTransaction.find(txnFilter)
    .populate('item_id', 'sku name')
    .populate('location_id', 'name code')
    .sort({ txn_time: -1 })
    .limit(20);

  // Get transaction summary by type
  const transactionsByType = await InventoryTransaction.aggregate([
    { $match: txnFilter },
    {
      $group: {
        _id: '$txn_type',
        count: { $sum: 1 },
        total_qty: { $sum: '$qty' }
      }
    }
  ]);

  return res.status(200).json(
    ApiResponse.success({
      by_location: inventoryByLocation,
      by_type: inventoryByType,
      recent_transactions: recentTransactions,
      transactions_by_type: transactionsByType
    })
  );
});

// @desc    Get shipment statistics
// @route   GET /api/dashboard/shipments
// @access  Private
exports.getShipmentStatistics = asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;
  
  const startDate = start_date ? new Date(start_date) : new Date(new Date().setDate(new Date().getDate() - 30));
  const endDate = end_date ? new Date(end_date) : new Date();

  const filter = { ship_date: { $gte: startDate, $lte: endDate } };

  // Get shipments by status
  const shipmentsByStatus = await Shipment.aggregate([
    { $match: filter },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  // Get shipments trend
  const shipmentsTrend = await Shipment.aggregate([
    { $match: filter },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$ship_date' } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Get on-time delivery rate (simplified - assumes delivered = on time)
  const totalShipments = await Shipment.countDocuments(filter);
  const deliveredShipments = await Shipment.countDocuments({ ...filter, status: 'DELIVERED' });
  const onTimeRate = totalShipments > 0 ? ((deliveredShipments / totalShipments) * 100).toFixed(2) : 0;

  return res.status(200).json(
    ApiResponse.success({
      period: { start_date: startDate, end_date: endDate },
      by_status: shipmentsByStatus,
      trend: shipmentsTrend,
      on_time_delivery_rate: onTimeRate,
      total_shipments: totalShipments,
      delivered_shipments: deliveredShipments
    })
  );
});
