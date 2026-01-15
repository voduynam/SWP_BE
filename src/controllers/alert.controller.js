const asyncHandler = require('../utils/asyncHandler');
const InventoryBalance = require('../models/InventoryBalance');
const Lot = require('../models/Lot');
const Item = require('../models/Item');
const Location = require('../models/Location');
const ApiResponse = require('../utils/ApiResponse');

// @desc    Get expiry alerts
// @route   GET /api/alerts/expiry
// @access  Private
exports.getExpiryAlerts = asyncHandler(async (req, res) => {
  const { location_id, days_threshold, severity } = req.query;
  const daysThreshold = parseInt(days_threshold) || 7; // Default 7 days
  
  const now = new Date();
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

  // Build filter
  const filter = {};
  if (location_id) {
    filter.location_id = location_id;
  } else if (!req.user.roles.includes('ADMIN') && !req.user.roles.includes('MANAGER')) {
    // Filter by user's org unit locations
    const userLocations = await Location.find({ org_unit_id: req.user.org_unit_id });
    const locationIds = userLocations.map(l => l._id);
    filter.location_id = { $in: locationIds };
  }

  // Get all inventory balances with lots
  const balances = await InventoryBalance.find({
    ...filter,
    lot_id: { $ne: null },
    qty_on_hand: { $gt: 0 }
  })
    .populate('location_id', 'name code org_unit_id')
    .populate('item_id', 'sku name item_type shelf_life_days')
    .populate('lot_id', 'lot_code mfg_date exp_date');

  // Filter and categorize by expiry
  const alerts = [];
  
  for (const balance of balances) {
    if (!balance.lot_id || !balance.lot_id.exp_date) continue;

    const expDate = new Date(balance.lot_id.exp_date);
    const daysUntilExpiry = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));

    // Determine severity
    let alertSeverity;
    if (daysUntilExpiry < 0) {
      alertSeverity = 'EXPIRED';
    } else if (daysUntilExpiry <= 2) {
      alertSeverity = 'CRITICAL';
    } else if (daysUntilExpiry <= 5) {
      alertSeverity = 'HIGH';
    } else if (daysUntilExpiry <= daysThreshold) {
      alertSeverity = 'MEDIUM';
    } else {
      continue; // Skip items beyond threshold
    }

    // Filter by severity if specified
    if (severity && alertSeverity !== severity) continue;

    alerts.push({
      alert_id: `alert_${balance._id}`,
      severity: alertSeverity,
      type: 'EXPIRY',
      location: balance.location_id,
      item: balance.item_id,
      lot: balance.lot_id,
      qty_on_hand: balance.qty_on_hand,
      exp_date: balance.lot_id.exp_date,
      days_until_expiry: daysUntilExpiry,
      message: daysUntilExpiry < 0 
        ? `Item expired ${Math.abs(daysUntilExpiry)} days ago`
        : `Item expires in ${daysUntilExpiry} days`,
      created_at: now
    });
  }

  // Sort by severity and days until expiry
  const severityOrder = { EXPIRED: 0, CRITICAL: 1, HIGH: 2, MEDIUM: 3 };
  alerts.sort((a, b) => {
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    return a.days_until_expiry - b.days_until_expiry;
  });

  return res.status(200).json(
    ApiResponse.success({
      total: alerts.length,
      alerts,
      summary: {
        expired: alerts.filter(a => a.severity === 'EXPIRED').length,
        critical: alerts.filter(a => a.severity === 'CRITICAL').length,
        high: alerts.filter(a => a.severity === 'HIGH').length,
        medium: alerts.filter(a => a.severity === 'MEDIUM').length
      }
    })
  );
});

// @desc    Get low stock alerts
// @route   GET /api/alerts/low-stock
// @access  Private
exports.getLowStockAlerts = asyncHandler(async (req, res) => {
  const { location_id, threshold_percentage } = req.query;
  const thresholdPercentage = parseFloat(threshold_percentage) || 20; // Default 20%

  // Build filter
  const filter = {};
  if (location_id) {
    filter.location_id = location_id;
  } else if (!req.user.roles.includes('ADMIN') && !req.user.roles.includes('MANAGER')) {
    const userLocations = await Location.find({ org_unit_id: req.user.org_unit_id });
    const locationIds = userLocations.map(l => l._id);
    filter.location_id = { $in: locationIds };
  }

  // Get inventory balances
  const balances = await InventoryBalance.find(filter)
    .populate('location_id', 'name code org_unit_id')
    .populate('item_id', 'sku name item_type')
    .populate('lot_id', 'lot_code mfg_date exp_date');

  const alerts = [];

  // Group by location and item (sum all lots)
  const itemBalances = {};
  for (const balance of balances) {
    const key = `${balance.location_id._id}_${balance.item_id._id}`;
    if (!itemBalances[key]) {
      itemBalances[key] = {
        location: balance.location_id,
        item: balance.item_id,
        total_qty: 0,
        reserved_qty: 0
      };
    }
    itemBalances[key].total_qty += balance.qty_on_hand;
    itemBalances[key].reserved_qty += balance.qty_reserved;
  }

  // Check for low stock (simple threshold for now)
  // In production, you'd have min/max levels per item per location
  const MIN_STOCK_DEFAULT = 10; // Default minimum stock level

  for (const key in itemBalances) {
    const data = itemBalances[key];
    const availableQty = data.total_qty - data.reserved_qty;
    
    if (availableQty <= MIN_STOCK_DEFAULT) {
      let severity;
      if (availableQty <= 0) {
        severity = 'CRITICAL';
      } else if (availableQty <= MIN_STOCK_DEFAULT * 0.3) {
        severity = 'HIGH';
      } else {
        severity = 'MEDIUM';
      }

      alerts.push({
        alert_id: `low_stock_${key}`,
        severity,
        type: 'LOW_STOCK',
        location: data.location,
        item: data.item,
        qty_on_hand: data.total_qty,
        qty_available: availableQty,
        qty_reserved: data.reserved_qty,
        min_stock: MIN_STOCK_DEFAULT,
        message: availableQty <= 0 
          ? 'Out of stock' 
          : `Low stock: ${availableQty} units remaining`,
        created_at: new Date()
      });
    }
  }

  // Sort by severity
  const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return res.status(200).json(
    ApiResponse.success({
      total: alerts.length,
      alerts,
      summary: {
        critical: alerts.filter(a => a.severity === 'CRITICAL').length,
        high: alerts.filter(a => a.severity === 'HIGH').length,
        medium: alerts.filter(a => a.severity === 'MEDIUM').length
      }
    })
  );
});

// @desc    Get all alerts summary
// @route   GET /api/alerts/summary
// @access  Private
exports.getAlertsSummary = asyncHandler(async (req, res) => {
  const { location_id } = req.query;

  // Get expiry alerts
  const expiryReq = { ...req, query: { ...req.query, days_threshold: 7 } };
  const expiryResult = await exports.getExpiryAlerts(expiryReq, { status: () => ({ json: (data) => data }) });
  const expiryData = expiryResult.data;

  // Get low stock alerts
  const lowStockResult = await exports.getLowStockAlerts(req, { status: () => ({ json: (data) => data }) });
  const lowStockData = lowStockResult.data;

  const summary = {
    total_alerts: expiryData.total + lowStockData.total,
    expiry_alerts: {
      total: expiryData.total,
      expired: expiryData.summary.expired,
      critical: expiryData.summary.critical,
      high: expiryData.summary.high,
      medium: expiryData.summary.medium
    },
    low_stock_alerts: {
      total: lowStockData.total,
      critical: lowStockData.summary.critical,
      high: lowStockData.summary.high,
      medium: lowStockData.summary.medium
    },
    recent_alerts: [
      ...expiryData.alerts.slice(0, 5),
      ...lowStockData.alerts.slice(0, 5)
    ].sort((a, b) => {
      const severityOrder = { EXPIRED: 0, CRITICAL: 1, HIGH: 2, MEDIUM: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    }).slice(0, 10)
  };

  return res.status(200).json(
    ApiResponse.success(summary)
  );
});
