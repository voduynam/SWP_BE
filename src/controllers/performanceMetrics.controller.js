const asyncHandler = require('../utils/asyncHandler');
const PerformanceMetrics = require('../models/PerformanceMetrics');
const Shipment = require('../models/Shipment');
const InternalOrder = require('../models/InternalOrder');
const ExceptionLog = require('../models/ExceptionLog');
const ApiResponse = require('../utils/ApiResponse');

// @desc    Get performance metrics
// @route   GET /api/performance-metrics
// @access  Private (Supply Coordinator, Manager, Admin)
exports.getMetrics = asyncHandler(async (req, res) => {
    const { metric_type, start_date, end_date } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (metric_type) filter.metric_type = metric_type;
    if (start_date || end_date) {
        filter.metric_date = {};
        if (start_date) filter.metric_date.$gte = new Date(start_date);
        if (end_date) filter.metric_date.$lte = new Date(end_date);
    }

    const metrics = await PerformanceMetrics.find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ metric_date: -1 });

    const total = await PerformanceMetrics.countDocuments(filter);

    return res.status(200).json(
        ApiResponse.paginate(metrics, page, limit, total)
    );
});

// @desc    Get metrics by type
// @route   GET /api/performance-metrics/:type
// @access  Private (Supply Coordinator, Manager, Admin)
exports.getMetricsByType = asyncHandler(async (req, res) => {
    const { type } = req.params;
    const { start_date, end_date } = req.query;

    const validTypes = ['DELIVERY_PERFORMANCE', 'ORDER_FULFILLMENT', 'EXCEPTION_HANDLING'];
    if (!validTypes.includes(type)) {
        return res.status(400).json(
            ApiResponse.error('Invalid metric type', 400)
        );
    }

    const filter = { metric_type: type };
    if (start_date || end_date) {
        filter.metric_date = {};
        if (start_date) filter.metric_date.$gte = new Date(start_date);
        if (end_date) filter.metric_date.$lte = new Date(end_date);
    }

    const metrics = await PerformanceMetrics.find(filter)
        .sort({ metric_date: -1 })
        .limit(30);

    return res.status(200).json(
        ApiResponse.success(metrics)
    );
});

// @desc    Calculate delivery performance metrics
// @route   POST /api/performance-metrics/calculate/delivery
// @access  Private (Supply Coordinator, Manager, Admin)
exports.calculateDeliveryPerformance = asyncHandler(async (req, res) => {
    const { metric_date } = req.body;
    const targetDate = metric_date ? new Date(metric_date) : new Date();

    // Get all shipments for the date
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const shipments = await Shipment.find({
        ship_date: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ['SHIPPED', 'IN_TRANSIT', 'DELIVERED'] }
    });

    const totalDeliveries = shipments.length;
    let onTimeDeliveries = 0;
    let lateDeliveries = 0;
    let totalDelayMins = 0;

    shipments.forEach(shipment => {
        // Simple logic: if status is DELIVERED, consider on-time
        // In real scenario, compare actual vs estimated delivery time
        if (shipment.status === 'DELIVERED') {
            onTimeDeliveries++;
        } else {
            lateDeliveries++;
        }
    });

    const onTimeRate = totalDeliveries > 0 ? onTimeDeliveries / totalDeliveries : 0;
    const averageDelayMins = lateDeliveries > 0 ? totalDelayMins / lateDeliveries : 0;

    const metrics = {
        total_deliveries: totalDeliveries,
        on_time_deliveries: onTimeDeliveries,
        late_deliveries: lateDeliveries,
        on_time_rate: parseFloat(onTimeRate.toFixed(2)),
        average_delay_mins: parseFloat(averageDelayMins.toFixed(2))
    };

    const performanceMetric = await PerformanceMetrics.create({
        _id: `perf_${Date.now()}`,
        metric_date: targetDate,
        metric_type: 'DELIVERY_PERFORMANCE',
        metrics
    });

    return res.status(201).json(
        ApiResponse.success(performanceMetric, 'Delivery performance calculated successfully', 201)
    );
});

// @desc    Calculate order fulfillment metrics
// @route   POST /api/performance-metrics/calculate/fulfillment
// @access  Private (Supply Coordinator, Manager, Admin)
exports.calculateOrderFulfillment = asyncHandler(async (req, res) => {
    const { metric_date } = req.body;
    const targetDate = metric_date ? new Date(metric_date) : new Date();

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const orders = await InternalOrder.find({
        order_date: { $gte: startOfDay, $lte: endOfDay }
    });

    const totalOrders = orders.length;
    const fullyFulfilled = orders.filter(o => o.status === 'RECEIVED').length;
    const partiallyFulfilled = orders.filter(o => o.status === 'SHIPPED' || o.status === 'PROCESSING').length;

    const fulfillmentRate = totalOrders > 0 ? fullyFulfilled / totalOrders : 0;

    const metrics = {
        total_orders: totalOrders,
        fully_fulfilled: fullyFulfilled,
        partially_fulfilled: partiallyFulfilled,
        fulfillment_rate: parseFloat(fulfillmentRate.toFixed(3)),
        average_fulfillment_time_hours: 24 // Placeholder
    };

    const performanceMetric = await PerformanceMetrics.create({
        _id: `perf_${Date.now()}`,
        metric_date: targetDate,
        metric_type: 'ORDER_FULFILLMENT',
        metrics
    });

    return res.status(201).json(
        ApiResponse.success(performanceMetric, 'Order fulfillment calculated successfully', 201)
    );
});

// @desc    Calculate exception handling metrics
// @route   POST /api/performance-metrics/calculate/exceptions
// @access  Private (Supply Coordinator, Manager, Admin)
exports.calculateExceptionHandling = asyncHandler(async (req, res) => {
    const { metric_date } = req.body;
    const targetDate = metric_date ? new Date(metric_date) : new Date();

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const exceptions = await ExceptionLog.find({
        reported_at: { $gte: startOfDay, $lte: endOfDay }
    });

    const totalExceptions = exceptions.length;
    const resolvedExceptions = exceptions.filter(e => e.status === 'RESOLVED').length;
    const openExceptions = exceptions.filter(e => e.status === 'OPEN').length;
    const criticalExceptions = exceptions.filter(e => e.severity === 'CRITICAL').length;

    // Calculate average resolution time
    const resolved = exceptions.filter(e => e.status === 'RESOLVED' && e.resolved_at);
    let avgResolutionTimeHours = 0;
    if (resolved.length > 0) {
        const totalTime = resolved.reduce((sum, exc) => {
            return sum + (exc.resolved_at - exc.reported_at);
        }, 0);
        avgResolutionTimeHours = (totalTime / resolved.length) / (1000 * 60 * 60);
    }

    const metrics = {
        total_exceptions: totalExceptions,
        resolved_exceptions: resolvedExceptions,
        open_exceptions: openExceptions,
        average_resolution_time_hours: parseFloat(avgResolutionTimeHours.toFixed(2)),
        critical_exceptions: criticalExceptions
    };

    const performanceMetric = await PerformanceMetrics.create({
        _id: `perf_${Date.now()}`,
        metric_date: targetDate,
        metric_type: 'EXCEPTION_HANDLING',
        metrics
    });

    return res.status(201).json(
        ApiResponse.success(performanceMetric, 'Exception handling metrics calculated successfully', 201)
    );
});

// @desc    Get dashboard data
// @route   GET /api/performance-metrics/dashboard
// @access  Private (Supply Coordinator, Manager, Admin)
exports.getDashboard = asyncHandler(async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get latest metrics for each type
    const deliveryMetrics = await PerformanceMetrics.findOne({
        metric_type: 'DELIVERY_PERFORMANCE'
    }).sort({ metric_date: -1 });

    const fulfillmentMetrics = await PerformanceMetrics.findOne({
        metric_type: 'ORDER_FULFILLMENT'
    }).sort({ metric_date: -1 });

    const exceptionMetrics = await PerformanceMetrics.findOne({
        metric_type: 'EXCEPTION_HANDLING'
    }).sort({ metric_date: -1 });

    return res.status(200).json(
        ApiResponse.success({
            delivery_performance: deliveryMetrics,
            order_fulfillment: fulfillmentMetrics,
            exception_handling: exceptionMetrics
        })
    );
});
