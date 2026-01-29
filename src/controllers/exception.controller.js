const asyncHandler = require('../utils/asyncHandler');
const ExceptionLog = require('../models/ExceptionLog');
const ApiResponse = require('../utils/ApiResponse');

// @desc    Get all exceptions
// @route   GET /api/exceptions
// @access  Private
exports.getExceptions = asyncHandler(async (req, res) => {
    const { exception_type, severity, status, store_org_unit_id } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (exception_type) filter.exception_type = exception_type;
    if (severity) filter.severity = severity;
    if (status) filter.status = status;
    if (store_org_unit_id) filter.store_org_unit_id = store_org_unit_id;

    const exceptions = await ExceptionLog.find(filter)
        .populate('order_id', 'order_no order_date')
        .populate('item_id', 'sku name')
        .populate('store_org_unit_id', 'name code')
        .populate('reported_by', 'username full_name')
        .populate('resolved_by', 'username full_name')
        .skip(skip)
        .limit(limit)
        .sort({ reported_at: -1 });

    const total = await ExceptionLog.countDocuments(filter);

    return res.status(200).json(
        ApiResponse.paginate(exceptions, page, limit, total)
    );
});

// @desc    Get single exception
// @route   GET /api/exceptions/:id
// @access  Private
exports.getException = asyncHandler(async (req, res) => {
    const exception = await ExceptionLog.findById(req.params.id)
        .populate('order_id', 'order_no order_date status')
        .populate('item_id', 'sku name item_type')
        .populate('store_org_unit_id', 'name code address')
        .populate('reported_by', 'username full_name')
        .populate('resolved_by', 'username full_name');

    if (!exception) {
        return res.status(404).json(
            ApiResponse.error('Exception not found', 404)
        );
    }

    return res.status(200).json(
        ApiResponse.success(exception)
    );
});

// @desc    Create exception
// @route   POST /api/exceptions
// @access  Private
exports.createException = asyncHandler(async (req, res) => {
    const {
        exception_type,
        severity,
        order_id,
        item_id,
        store_org_unit_id,
        description
    } = req.body;

    const exception = await ExceptionLog.create({
        _id: `exc_${Date.now()}`,
        exception_type,
        severity,
        order_id: order_id || null,
        item_id: item_id || null,
        store_org_unit_id,
        description,
        reported_by: req.user.id,
        status: 'OPEN'
    });

    const populatedException = await ExceptionLog.findById(exception._id)
        .populate('order_id', 'order_no order_date')
        .populate('item_id', 'sku name')
        .populate('store_org_unit_id', 'name code')
        .populate('reported_by', 'username full_name');

    // --- [NOTIFICATION TRIGGER] ---
    const notificationController = require('./notification.controller');
    const isUrgent = severity === 'HIGH' || severity === 'CRITICAL';

    await notificationController.createNotificationInternal({
        recipient_role: 'SUPPLY_COORDINATOR',
        title: isUrgent ? 'SỰ CỐ KHẨN CẤP!' : 'Sự cố mới được ghi nhận',
        message: `Cửa hàng ${populatedException.store_org_unit_id.name} báo cáo sự cố: ${description.substring(0, 50)}...`,
        type: isUrgent ? 'URGENT' : 'ERROR',
        ref_type: 'EXCEPTION',
        ref_id: exception._id
    });

    if (isUrgent) {
        await notificationController.createNotificationInternal({
            recipient_role: 'MANAGER',
            title: 'Cảnh báo sự cố nghiêm trọng',
            message: `Phát hiện sự cố mức độ ${severity} từ ${populatedException.store_org_unit_id.name}`,
            type: 'URGENT',
            ref_type: 'EXCEPTION',
            ref_id: exception._id
        });
    }

    return res.status(201).json(
        ApiResponse.success(populatedException, 'Exception created successfully', 201)
    );
});

// @desc    Update exception
// @route   PUT /api/exceptions/:id
// @access  Private (Supply Coordinator, Manager, Admin)
exports.updateException = asyncHandler(async (req, res) => {
    const exception = await ExceptionLog.findById(req.params.id);

    if (!exception) {
        return res.status(404).json(
            ApiResponse.error('Exception not found', 404)
        );
    }

    const { exception_type, severity, description, status } = req.body;

    if (exception_type) exception.exception_type = exception_type;
    if (severity) exception.severity = severity;
    if (description) exception.description = description;
    if (status) exception.status = status;

    await exception.save();

    const populatedException = await ExceptionLog.findById(exception._id)
        .populate('order_id', 'order_no order_date')
        .populate('item_id', 'sku name')
        .populate('store_org_unit_id', 'name code')
        .populate('reported_by', 'username full_name')
        .populate('resolved_by', 'username full_name');

    return res.status(200).json(
        ApiResponse.success(populatedException, 'Exception updated successfully')
    );
});

// @desc    Resolve exception
// @route   PUT /api/exceptions/:id/resolve
// @access  Private (Supply Coordinator, Manager, Admin)
exports.resolveException = asyncHandler(async (req, res) => {
    const { resolution } = req.body;

    if (!resolution) {
        return res.status(400).json(
            ApiResponse.error('Resolution is required', 400)
        );
    }

    const exception = await ExceptionLog.findById(req.params.id);

    if (!exception) {
        return res.status(404).json(
            ApiResponse.error('Exception not found', 404)
        );
    }

    exception.status = 'RESOLVED';
    exception.resolution = resolution;
    exception.resolved_by = req.user.id;
    exception.resolved_at = new Date();

    await exception.save();

    const populatedException = await ExceptionLog.findById(exception._id)
        .populate('order_id', 'order_no order_date')
        .populate('item_id', 'sku name')
        .populate('store_org_unit_id', 'name code')
        .populate('reported_by', 'username full_name')
        .populate('resolved_by', 'username full_name');

    return res.status(200).json(
        ApiResponse.success(populatedException, 'Exception resolved successfully')
    );
});

// @desc    Get exception summary
// @route   GET /api/exceptions/summary
// @access  Private (Supply Coordinator, Manager, Admin)
exports.getExceptionSummary = asyncHandler(async (req, res) => {
    const { start_date, end_date } = req.query;

    const filter = {};
    if (start_date || end_date) {
        filter.reported_at = {};
        if (start_date) filter.reported_at.$gte = new Date(start_date);
        if (end_date) filter.reported_at.$lte = new Date(end_date);
    }

    const totalExceptions = await ExceptionLog.countDocuments(filter);

    const byType = await ExceptionLog.aggregate([
        { $match: filter },
        { $group: { _id: '$exception_type', count: { $sum: 1 } } }
    ]);

    const bySeverity = await ExceptionLog.aggregate([
        { $match: filter },
        { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);

    const byStatus = await ExceptionLog.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Calculate average resolution time
    const resolvedExceptions = await ExceptionLog.find({
        ...filter,
        status: 'RESOLVED',
        resolved_at: { $ne: null }
    });

    let avgResolutionTimeHours = 0;
    if (resolvedExceptions.length > 0) {
        const totalResolutionTime = resolvedExceptions.reduce((sum, exc) => {
            const diff = exc.resolved_at - exc.reported_at;
            return sum + diff;
        }, 0);
        avgResolutionTimeHours = (totalResolutionTime / resolvedExceptions.length) / (1000 * 60 * 60);
    }

    return res.status(200).json(
        ApiResponse.success({
            total: totalExceptions,
            by_type: byType,
            by_severity: bySeverity,
            by_status: byStatus,
            average_resolution_time_hours: avgResolutionTimeHours.toFixed(2)
        })
    );
});
