const asyncHandler = require('../utils/asyncHandler');
const PerformanceViolation = require('../models/PerformanceViolation');
const WorkflowAssignment = require('../models/WorkflowAssignment');
const PerformanceService = require('../services/performanceService');
const ApiResponse = require('../utils/ApiResponse');

// @desc    Get all performance violations for manager review
// @route   GET /api/performance/violations
// @access  Private (Manager, Admin)
exports.getViolations = asyncHandler(async (req, res) => {
  const { status, violation_type, user_id, severity, start_date, end_date } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = {};
  if (status) filter.status = status;
  if (violation_type) filter.violation_type = violation_type;
  if (user_id) filter.user_id = user_id;
  if (severity) filter.severity = severity;
  if (start_date || end_date) {
    filter.detected_at = {};
    if (start_date) filter.detected_at.$gte = new Date(start_date);
    if (end_date) filter.detected_at.$lte = new Date(end_date);
  }

  const violations = await PerformanceViolation.find(filter)
    .populate('user_id', 'username full_name')
    .populate('manager_reviewed_by', 'username full_name')
    .skip(skip)
    .limit(limit)
    .sort({ detected_at: -1 });

  const total = await PerformanceViolation.countDocuments(filter);

  // Get summary statistics
  const summary = await PerformanceViolation.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  return res.status(200).json(
    ApiResponse.paginate(violations, page, limit, total, { summary })
  );
});

// @desc    Get single violation details
// @route   GET /api/performance/violations/:id
// @access  Private (Manager, Admin)
exports.getViolation = asyncHandler(async (req, res) => {
  const violation = await PerformanceViolation.findById(req.params.id)
    .populate('user_id', 'username full_name email phone')
    .populate('manager_reviewed_by', 'username full_name');

  if (!violation) {
    return res.status(404).json(
      ApiResponse.error('Performance violation not found', 404)
    );
  }

  // Get related context based on reference type
  let relatedData = {};
  
  if (violation.reference_type === 'PRODUCTION_ORDER') {
    const ProductionOrder = require('../models/ProductionOrder');
    const ProductionOrderLine = require('../models/ProductionOrderLine');
    
    const productionOrder = await ProductionOrder.findById(violation.reference_id)
      .populate('created_by', 'username full_name');
    const productionLines = await ProductionOrderLine.find({ prod_order_id: violation.reference_id })
      .populate('item_id', 'name sku');
    
    relatedData = { productionOrder, productionLines };
  } else if (violation.reference_type === 'SHIPMENT') {
    const Shipment = require('../models/Shipment');
    const shipment = await Shipment.findById(violation.reference_id)
      .populate('order_id', 'order_no')
      .populate('from_location_id', 'name')
      .populate('to_location_id', 'name');
    
    relatedData = { shipment };
  }

  return res.status(200).json(
    ApiResponse.success({
      violation,
      relatedData
    })
  );
});

// @desc    Manager review violation (confirm or dismiss)
// @route   PUT /api/performance/violations/:id/review
// @access  Private (Manager, Admin)
exports.reviewViolation = asyncHandler(async (req, res) => {
  const { manager_decision, manager_notes, resolution_required, resolution_notes } = req.body;

  const violation = await PerformanceViolation.findById(req.params.id);
  if (!violation) {
    return res.status(404).json(
      ApiResponse.error('Performance violation not found', 404)
    );
  }

  // Validate manager decision
  const validDecisions = ['CONFIRMED', 'DISMISSED'];
  if (!validDecisions.includes(manager_decision)) {
    return res.status(400).json(
      ApiResponse.error('Invalid manager decision. Must be CONFIRMED or DISMISSED', 400)
    );
  }

  // Update violation with manager review
  violation.manager_reviewed = true;
  violation.manager_reviewed_at = new Date();
  violation.manager_reviewed_by = req.user.id;
  violation.manager_decision = manager_decision;
  violation.manager_notes = manager_notes || '';
  violation.resolution_required = resolution_required || false;
  violation.resolution_notes = resolution_notes || '';
  
  // Update status based on decision
  if (manager_decision === 'CONFIRMED') {
    violation.is_confirmed_violation = true;
    violation.status = resolution_required ? 'CONFIRMED' : 'RESOLVED';
    if (!resolution_required) {
      violation.resolved_at = new Date();
    }
  } else {
    violation.status = 'DISMISSED';
    violation.resolved_at = new Date();
  }

  violation.updated_at = new Date();
  await violation.save();

  // Create notification to the violating user
  const Notification = require('../models/Notification');
  const notificationId = `notif_perf_review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  await Notification.create({
    _id: notificationId,
    recipient_role: violation.user_role,
    recipient_id: violation.user_id,
    title: `Performance Review: ${manager_decision}`,
    message: manager_decision === 'CONFIRMED' 
      ? `Your performance violation has been confirmed by manager. ${manager_notes}`
      : `Your performance alert has been dismissed by manager. ${manager_notes}`,
    type: manager_decision === 'CONFIRMED' ? 'URGENT' : 'INFO',
    ref_type: 'PERFORMANCE_VIOLATION',
    ref_id: violation._id
  });

  const populatedViolation = await PerformanceViolation.findById(violation._id)
    .populate('user_id', 'username full_name')
    .populate('manager_reviewed_by', 'username full_name');

  return res.status(200).json(
    ApiResponse.success(populatedViolation, `Violation ${manager_decision.toLowerCase()} successfully`)
  );
});

// @desc    Get performance dashboard data
// @route   GET /api/performance/dashboard
// @access  Private (Manager, Admin)
exports.getDashboard = asyncHandler(async (req, res) => {
  const { period = '7d' } = req.query;
  
  // Calculate date range
  const now = new Date();
  let startDate;
  switch (period) {
    case '1d':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  // Get violation statistics
  const violationStats = await PerformanceViolation.aggregate([
    {
      $match: {
        detected_at: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          violation_type: '$violation_type',
          status: '$status'
        },
        count: { $sum: 1 }
      }
    }
  ]);

  // Get user performance summary
  const userPerformance = await PerformanceViolation.aggregate([
    {
      $match: {
        detected_at: { $gte: startDate },
        status: 'CONFIRMED'
      }
    },
    {
      $group: {
        _id: '$user_id',
        total_violations: { $sum: 1 },
        severity_breakdown: {
          $push: '$severity'
        }
      }
    },
    {
      $lookup: {
        from: 'app_user',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $unwind: '$user'
    },
    {
      $project: {
        user_id: '$_id',
        username: '$user.username',
        full_name: '$user.full_name',
        total_violations: 1,
        severity_breakdown: 1
      }
    },
    {
      $sort: { total_violations: -1 }
    },
    {
      $limit: 10
    }
  ]);

  // Get pending reviews count
  const pendingReviews = await PerformanceViolation.countDocuments({
    manager_reviewed: false,
    status: 'OPEN'
  });

  return res.status(200).json(
    ApiResponse.success({
      period,
      date_range: { start: startDate, end: now },
      violation_stats: violationStats,
      user_performance: userPerformance,
      pending_reviews: pendingReviews
    })
  );
});

// @desc    Run performance checks manually
// @route   POST /api/performance/run-checks
// @access  Private (Manager, Admin)
exports.runPerformanceChecks = asyncHandler(async (req, res) => {
  const results = await PerformanceService.runPerformanceChecks();
  
  return res.status(200).json(
    ApiResponse.success(results, 'Performance checks completed successfully')
  );
});

// @desc    Get user performance history
// @route   GET /api/performance/users/:userId/history
// @access  Private (Manager, Admin)
exports.getUserPerformanceHistory = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { start_date, end_date } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = { user_id: userId };
  if (start_date || end_date) {
    filter.detected_at = {};
    if (start_date) filter.detected_at.$gte = new Date(start_date);
    if (end_date) filter.detected_at.$lte = new Date(end_date);
  }

  const violations = await PerformanceViolation.find(filter)
    .populate('manager_reviewed_by', 'username full_name')
    .skip(skip)
    .limit(limit)
    .sort({ detected_at: -1 });

  const total = await PerformanceViolation.countDocuments(filter);

  // Get user info
  const AppUser = require('../models/AppUser');
  const user = await AppUser.findById(userId).select('username full_name email');

  return res.status(200).json(
    ApiResponse.paginate(violations, page, limit, total, { user })
  );
});