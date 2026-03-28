const asyncHandler = require('../utils/asyncHandler');
const WasteTransaction = require('../models/WasteTransaction');
const ApiResponse = require('../utils/ApiResponse');

// @desc    Get waste summary report
// @route   GET /api/waste-reports/summary
// @access  Private (Manager, Admin)
exports.getWasteSummary = asyncHandler(async (req, res) => {
  const { start_date, end_date, location_id } = req.query;
  
  const matchConditions = {};
  
  if (start_date || end_date) {
    matchConditions.transaction_date = {};
    if (start_date) matchConditions.transaction_date.$gte = new Date(start_date);
    if (end_date) matchConditions.transaction_date.$lte = new Date(end_date);
  }
  
  if (location_id) {
    matchConditions.location_id = location_id;
  }

  const pipeline = [
    { $match: matchConditions },
    {
      $group: {
        _id: '$waste_type',
        total_quantity: { $sum: '$quantity_wasted' },
        total_value: { $sum: '$total_waste_value' },
        transaction_count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: null,
        categories: {
          $push: {
            waste_type: '$_id',
            total_quantity: '$total_quantity',
            total_value: '$total_value',
            transaction_count: '$transaction_count'
          }
        },
        grand_total_value: { $sum: '$total_value' },
        grand_total_quantity: { $sum: '$total_quantity' },
        total_transactions: { $sum: '$transaction_count' }
      }
    }
  ];

  const result = await WasteTransaction.aggregate(pipeline);
  
  const summary = result.length > 0 ? result[0] : {
    categories: [],
    grand_total_value: 0,
    grand_total_quantity: 0,
    total_transactions: 0
  };

  // Calculate percentages
  summary.categories = summary.categories.map(category => ({
    ...category,
    percentage: summary.grand_total_value > 0 
      ? (category.total_value / summary.grand_total_value * 100).toFixed(2)
      : 0
  }));

  return res.status(200).json(
    ApiResponse.success(summary)
  );
});

// @desc    Get waste report by category
// @route   GET /api/waste-reports/by-category
// @access  Private (Manager, Admin)
exports.getWasteByCategory = asyncHandler(async (req, res) => {
  const { waste_type, start_date, end_date, location_id } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const matchConditions = {};
  
  if (waste_type) matchConditions.waste_type = waste_type;
  if (location_id) matchConditions.location_id = location_id;
  
  if (start_date || end_date) {
    matchConditions.transaction_date = {};
    if (start_date) matchConditions.transaction_date.$gte = new Date(start_date);
    if (end_date) matchConditions.transaction_date.$lte = new Date(end_date);
  }

  const pipeline = [
    { $match: matchConditions },
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
    },
    {
      $lookup: {
        from: 'location',
        localField: 'location_id',
        foreignField: '_id',
        as: 'location'
      }
    },
    {
      $unwind: '$location'
    },
    {
      $lookup: {
        from: 'app_user',
        localField: 'created_by',
        foreignField: '_id',
        as: 'created_by_user'
      }
    },
    {
      $unwind: '$created_by_user'
    },
    { $sort: { transaction_date: -1 } },
    { $skip: skip },
    { $limit: limit }
  ];

  const wasteTransactions = await WasteTransaction.aggregate(pipeline);

  // Get total count
  const countPipeline = [
    { $match: matchConditions },
    { $count: 'total' }
  ];
  const countResult = await WasteTransaction.aggregate(countPipeline);
  const total = countResult.length > 0 ? countResult[0].total : 0;

  return res.status(200).json(
    ApiResponse.paginate(wasteTransactions, page, limit, total)
  );
});

// @desc    Get top wasted items
// @route   GET /api/waste-reports/top-wasted-items
// @access  Private (Manager, Admin)
exports.getTopWastedItems = asyncHandler(async (req, res) => {
  const { start_date, end_date, location_id, limit: queryLimit } = req.query;
  const limit = parseInt(queryLimit) || 10;

  const matchConditions = {};
  
  if (location_id) matchConditions.location_id = location_id;
  
  if (start_date || end_date) {
    matchConditions.transaction_date = {};
    if (start_date) matchConditions.transaction_date.$gte = new Date(start_date);
    if (end_date) matchConditions.transaction_date.$lte = new Date(end_date);
  }

  const pipeline = [
    { $match: matchConditions },
    {
      $group: {
        _id: '$item_id',
        total_quantity_wasted: { $sum: '$quantity_wasted' },
        total_value_wasted: { $sum: '$total_waste_value' },
        waste_count: { $sum: 1 },
        avg_waste_value: { $avg: '$total_waste_value' }
      }
    },
    {
      $lookup: {
        from: 'item',
        localField: '_id',
        foreignField: '_id',
        as: 'item'
      }
    },
    {
      $unwind: '$item'
    },
    { $sort: { total_value_wasted: -1 } },
    { $limit: limit }
  ];

  const topWastedItems = await WasteTransaction.aggregate(pipeline);

  return res.status(200).json(
    ApiResponse.success(topWastedItems)
  );
});

// @desc    Get waste cost analysis
// @route   GET /api/waste-reports/cost-analysis
// @access  Private (Manager, Admin)
exports.getWasteCostAnalysis = asyncHandler(async (req, res) => {
  const { start_date, end_date, location_id } = req.query;

  const matchConditions = {};
  
  if (location_id) matchConditions.location_id = location_id;
  
  if (start_date || end_date) {
    matchConditions.transaction_date = {};
    if (start_date) matchConditions.transaction_date.$gte = new Date(start_date);
    if (end_date) matchConditions.transaction_date.$lte = new Date(end_date);
  }

  // Monthly waste trend
  const monthlyTrendPipeline = [
    { $match: matchConditions },
    {
      $group: {
        _id: {
          year: { $year: '$transaction_date' },
          month: { $month: '$transaction_date' }
        },
        monthly_waste_value: { $sum: '$total_waste_value' },
        monthly_waste_quantity: { $sum: '$quantity_wasted' },
        transaction_count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ];

  // Waste by disposal method
  const disposalMethodPipeline = [
    { $match: matchConditions },
    {
      $group: {
        _id: '$disposal_method',
        total_value: { $sum: '$total_waste_value' },
        total_quantity: { $sum: '$quantity_wasted' },
        count: { $sum: 1 }
      }
    },
    { $sort: { total_value: -1 } }
  ];

  // Average waste per transaction
  const avgWastePipeline = [
    { $match: matchConditions },
    {
      $group: {
        _id: null,
        avg_waste_value: { $avg: '$total_waste_value' },
        avg_waste_quantity: { $avg: '$quantity_wasted' },
        max_waste_value: { $max: '$total_waste_value' },
        min_waste_value: { $min: '$total_waste_value' }
      }
    }
  ];

  const [monthlyTrend, disposalMethods, avgWaste] = await Promise.all([
    WasteTransaction.aggregate(monthlyTrendPipeline),
    WasteTransaction.aggregate(disposalMethodPipeline),
    WasteTransaction.aggregate(avgWastePipeline)
  ]);

  return res.status(200).json(
    ApiResponse.success({
      monthly_trend: monthlyTrend,
      disposal_methods: disposalMethods,
      averages: avgWaste.length > 0 ? avgWaste[0] : {
        avg_waste_value: 0,
        avg_waste_quantity: 0,
        max_waste_value: 0,
        min_waste_value: 0
      }
    })
  );
});

// @desc    Get waste transactions
// @route   GET /api/waste-reports/transactions
// @access  Private (Manager, Admin)
exports.getWasteTransactions = asyncHandler(async (req, res) => {
  const { 
    waste_type, 
    reference_type, 
    start_date, 
    end_date, 
    location_id,
    disposal_method 
  } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = {};
  
  if (waste_type) filter.waste_type = waste_type;
  if (reference_type) filter.reference_type = reference_type;
  if (disposal_method) filter.disposal_method = disposal_method;
  if (location_id) filter.location_id = location_id;
  
  if (start_date || end_date) {
    filter.transaction_date = {};
    if (start_date) filter.transaction_date.$gte = new Date(start_date);
    if (end_date) filter.transaction_date.$lte = new Date(end_date);
  }

  const transactions = await WasteTransaction.find(filter)
    .populate('item_id', 'sku name item_type')
    .populate('lot_id', 'lot_code exp_date')
    .populate('location_id', 'name code')
    .populate('created_by', 'username full_name')
    .populate('approved_by', 'username full_name')
    .skip(skip)
    .limit(limit)
    .sort({ transaction_date: -1 });

  const total = await WasteTransaction.countDocuments(filter);

  return res.status(200).json(
    ApiResponse.paginate(transactions, page, limit, total)
  );
});