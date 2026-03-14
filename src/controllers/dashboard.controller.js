const asyncHandler = require('../utils/asyncHandler');
const InternalOrder = require('../models/InternalOrder');
const InternalOrderLine = require('../models/InternalOrderLine');
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

// @desc    Get profit statistics (Revenue - Cost of Goods Sold)
// @route   GET /api/dashboard/profit
// @access  Private
exports.getProfitStatistics = asyncHandler(async (req, res) => {
  const { start_date, end_date, org_unit_id, group_by } = req.query;
  
  const startDate = start_date ? new Date(start_date) : new Date(new Date().setDate(new Date().getDate() - 30));
  const endDate = end_date ? new Date(end_date) : new Date();
  const groupBy = group_by || 'day'; // day, week, month

  const filter = { 
    order_date: { $gte: startDate, $lte: endDate },
    status: { $in: ['RECEIVED', 'SHIPPED'] } // Only consider completed/shipped orders
  };
  
  if (org_unit_id) {
    filter.store_org_unit_id = org_unit_id;
  } else if (!req.user.roles.includes('ADMIN') && !req.user.roles.includes('MANAGER')) {
    filter.store_org_unit_id = req.user.org_unit_id;
  }

  // Get all orders with their line items and item details
  const orders = await InternalOrder.find(filter);
  const orderIds = orders.map(order => order._id);

  const orderLines = await InternalOrderLine.find({ order_id: { $in: orderIds } })
    .populate('item_id', 'cost_price sku name');

  // Calculate profit for each line
  let totalRevenue = 0;
  let totalCost = 0;
  let profits = [];

  orderLines.forEach(line => {
    const revenue = line.line_total; // unit_price * qty_ordered
    const cost = (line.item_id?.cost_price || 0) * line.qty_ordered;
    const profit = revenue - cost;
    
    totalRevenue += revenue;
    totalCost += cost;
    
    profits.push({
      order_id: line.order_id,
      item_id: line.item_id?._id,
      item_name: line.item_id?.name,
      item_sku: line.item_id?.sku,
      qty: line.qty_ordered,
      selling_price: line.unit_price,
      cost_price: line.item_id?.cost_price || 0,
      revenue,
      cost,
      profit
    });
  });

  const totalProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(2) : 0;

  // Group profits by date if requested
  let profitTrend = [];
  if (groupBy) {
    const profitByDate = {};
    
    for (const orderId of orderIds) {
      const order = orders.find(o => o._id === orderId);
      const orderProfit = profits
        .filter(p => p.order_id === orderId)
        .reduce((sum, p) => sum + p.profit, 0);
      
      let dateKey;
      switch (groupBy) {
        case 'week':
          dateKey = `Week ${Math.floor((order.order_date.getDate() - 1) / 7 + 1)}`;
          break;
        case 'month':
          dateKey = order.order_date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          break;
        default: // day
          dateKey = order.order_date.toLocaleDateString('en-US');
      }
      
      if (!profitByDate[dateKey]) {
        profitByDate[dateKey] = { revenue: 0, cost: 0, profit: 0, order_count: 0 };
      }
      
      const dayRevenue = profits
        .filter(p => p.order_id === orderId)
        .reduce((sum, p) => sum + p.revenue, 0);
      const dayCost = profits
        .filter(p => p.order_id === orderId)
        .reduce((sum, p) => sum + p.cost, 0);
      
      profitByDate[dateKey].revenue += dayRevenue;
      profitByDate[dateKey].cost += dayCost;
      profitByDate[dateKey].profit += orderProfit;
      profitByDate[dateKey].order_count += 1;
    }
    
    profitTrend = Object.entries(profitByDate).map(([date, data]) => ({
      date,
      ...data,
      margin: data.revenue > 0 ? ((data.profit / data.revenue) * 100).toFixed(2) : 0
    }));
  }

  // Get top profit items
  const profitByItem = {};
  profits.forEach(p => {
    if (!profitByItem[p.item_id]) {
      profitByItem[p.item_id] = {
        item_id: p.item_id,
        item_name: p.item_name,
        item_sku: p.item_sku,
        qty_sold: 0,
        total_revenue: 0,
        total_cost: 0,
        total_profit: 0
      };
    }
    profitByItem[p.item_id].qty_sold += p.qty;
    profitByItem[p.item_id].total_revenue += p.revenue;
    profitByItem[p.item_id].total_cost += p.cost;
    profitByItem[p.item_id].total_profit += p.profit;
  });

  const topProfitItems = Object.values(profitByItem)
    .sort((a, b) => b.total_profit - a.total_profit)
    .slice(0, 10);

  return res.status(200).json(
    ApiResponse.success({
      period: { start_date: startDate, end_date: endDate },
      summary: {
        total_revenue: totalRevenue,
        total_cost: totalCost,
        total_profit: totalProfit,
        profit_margin_percent: profitMargin,
        order_count: orderIds.length,
        item_count: Object.keys(profitByItem).length
      },
      trend: profitTrend,
      top_profit_items: topProfitItems,
      all_profits: profits
    })
  );
});
