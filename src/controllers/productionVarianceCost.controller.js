const asyncHandler = require('../utils/asyncHandler');
const ProductionVarianceCost = require('../models/ProductionVarianceCost');
const ApiResponse = require('../utils/ApiResponse');

// @desc    Get all production variance costs
// @route   GET /api/production-variance-costs
// @access  Private (Manager, Admin)
exports.getProductionVarianceCosts = asyncHandler(async (req, res) => {
  const { status, variance_type, start_date, end_date } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = {};
  if (status) filter.status = status;
  if (variance_type) filter.variance_type = variance_type;
  
  if (start_date || end_date) {
    filter.created_at = {};
    if (start_date) filter.created_at.$gte = new Date(start_date);
    if (end_date) filter.created_at.$lte = new Date(end_date);
  }

  const varianceCosts = await ProductionVarianceCost.find(filter)
    .populate('original_production_order_id', 'prod_order_no status')
    .populate('compensating_production_order_id', 'prod_order_no status')
    .populate('created_by', 'username full_name')
    .populate('approved_by', 'username full_name')
    .skip(skip)
    .limit(limit)
    .sort({ created_at: -1 });

  const total = await ProductionVarianceCost.countDocuments(filter);

  // Calculate summary statistics
  const summary = await ProductionVarianceCost.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        total_variance_cost: { $sum: '$total_variance_cost' },
        total_profit_impact: { $sum: '$impact_on_profit' },
        count: { $sum: 1 },
        avg_variance_cost: { $avg: '$total_variance_cost' }
      }
    }
  ]);

  return res.status(200).json(
    ApiResponse.success({
      variance_costs: varianceCosts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      summary: summary[0] || {
        total_variance_cost: 0,
        total_profit_impact: 0,
        count: 0,
        avg_variance_cost: 0
      }
    })
  );
});

// @desc    Get single production variance cost
// @route   GET /api/production-variance-costs/:id
// @access  Private (Manager, Admin)
exports.getProductionVarianceCost = asyncHandler(async (req, res) => {
  const varianceCost = await ProductionVarianceCost.findById(req.params.id)
    .populate('original_production_order_id', 'prod_order_no status planned_start actual_start')
    .populate('compensating_production_order_id', 'prod_order_no status planned_start actual_start')
    .populate('created_by', 'username full_name')
    .populate('approved_by', 'username full_name');

  if (!varianceCost) {
    return res.status(404).json(
      ApiResponse.error('Production variance cost record not found', 404)
    );
  }

  return res.status(200).json(
    ApiResponse.success(varianceCost)
  );
});

// @desc    Approve/Reject production variance cost
// @route   PUT /api/production-variance-costs/:id/review
// @access  Private (Manager, Admin)
exports.reviewProductionVarianceCost = asyncHandler(async (req, res) => {
  const { action, notes } = req.body;

  if (!['APPROVE', 'REJECT'].includes(action)) {
    return res.status(400).json(
      ApiResponse.error('Action must be APPROVE or REJECT', 400)
    );
  }

  const varianceCost = await ProductionVarianceCost.findById(req.params.id);
  if (!varianceCost) {
    return res.status(404).json(
      ApiResponse.error('Production variance cost record not found', 404)
    );
  }

  if (varianceCost.status !== 'PENDING') {
    return res.status(400).json(
      ApiResponse.error('Only pending variance costs can be reviewed', 400)
    );
  }

  varianceCost.status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
  varianceCost.approved_by = req.user.id;
  varianceCost.notes = notes || '';
  varianceCost.updated_at = new Date();
  await varianceCost.save();

  // Create notification
  try {
    const { createNotificationInternal } = require('./notification.controller');
    await createNotificationInternal({
      recipient_id: varianceCost.created_by,
      title: `Production Variance Cost ${action === 'APPROVE' ? 'Approved' : 'Rejected'}`,
      message: `Variance cost record for ${varianceCost.total_variance_cost.toLocaleString()} VND has been ${action.toLowerCase()}d.`,
      type: action === 'APPROVE' ? 'SUCCESS' : 'ERROR',
      ref_type: 'PRODUCTION',
      ref_id: varianceCost._id
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }

  const populatedVarianceCost = await ProductionVarianceCost.findById(varianceCost._id)
    .populate('original_production_order_id', 'prod_order_no')
    .populate('compensating_production_order_id', 'prod_order_no')
    .populate('approved_by', 'username full_name');

  return res.status(200).json(
    ApiResponse.success(populatedVarianceCost, `Production variance cost ${action.toLowerCase()}d successfully`)
  );
});

// @desc    Get production variance cost summary by period
// @route   GET /api/production-variance-costs/summary
// @access  Private (Manager, Admin)
exports.getVarianceCostSummary = asyncHandler(async (req, res) => {
  const { period = 'month', year = new Date().getFullYear() } = req.query;

  let groupBy;
  if (period === 'month') {
    groupBy = {
      year: { $year: '$created_at' },
      month: { $month: '$created_at' }
    };
  } else if (period === 'week') {
    groupBy = {
      year: { $year: '$created_at' },
      week: { $week: '$created_at' }
    };
  } else {
    groupBy = {
      year: { $year: '$created_at' }
    };
  }

  const summary = await ProductionVarianceCost.aggregate([
    {
      $match: {
        created_at: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: groupBy,
        total_cost: { $sum: '$total_variance_cost' },
        total_impact: { $sum: '$impact_on_profit' },
        count: { $sum: 1 },
        avg_cost: { $avg: '$total_variance_cost' },
        variance_types: { $push: '$variance_type' }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1 }
    }
  ]);

  return res.status(200).json(
    ApiResponse.success({
      period,
      year: parseInt(year),
      summary,
      total_records: summary.length
    })
  );
});