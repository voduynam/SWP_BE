const asyncHandler = require('../utils/asyncHandler');
const DeliveryRoute = require('../models/DeliveryRoute');
const RouteStop = require('../models/RouteStop');
const AppUser = require('../models/AppUser');
const ApiResponse = require('../utils/ApiResponse');

// @desc    Get all delivery routes
// @route   GET /api/delivery-routes
// @access  Private (Supply Coordinator, Manager, Admin)
exports.getDeliveryRoutes = asyncHandler(async (req, res) => {
    const { status, start_date, end_date } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (status) filter.status = status;
    if (start_date || end_date) {
        filter.planned_date = {};
        if (start_date) filter.planned_date.$gte = new Date(start_date);
        if (end_date) filter.planned_date.$lte = new Date(end_date);
    }

    const routes = await DeliveryRoute.find(filter)
        .populate('created_by', 'username full_name')
        .skip(skip)
        .limit(limit)
        .sort({ planned_date: -1 });

    const total = await DeliveryRoute.countDocuments(filter);

    return res.status(200).json(
        ApiResponse.paginate(routes, page, limit, total)
    );
});

// @desc    Get single delivery route with stops
// @route   GET /api/delivery-routes/:id
// @access  Private
exports.getDeliveryRoute = asyncHandler(async (req, res) => {
    const route = await DeliveryRoute.findById(req.params.id)
        .populate('created_by', 'username full_name');

    if (!route) {
        return res.status(404).json(
            ApiResponse.error('Delivery route not found', 404)
        );
    }

    const stops = await RouteStop.find({ route_id: route._id })
        .populate('store_org_unit_id', 'name code address')
        .populate('shipment_ids', 'shipment_no status')
        .sort({ sequence: 1 });

    return res.status(200).json(
        ApiResponse.success({
            ...route.toObject(),
            stops
        })
    );
});

// @desc    Create delivery route
// @route   POST /api/delivery-routes
// @access  Private (Supply Coordinator, Manager, Admin)
exports.createDeliveryRoute = asyncHandler(async (req, res) => {
    const {
        route_name,
        driver_id,
        vehicle_no,
        vehicle_type,
        planned_date,
        total_distance_km,
        estimated_duration_mins
    } = req.body;

    // Get driver info from driver_id
    let driver_name = '';
    let driver_phone = '';
    if (driver_id) {
        const driver = await AppUser.findById(driver_id);
        if (!driver) {
            return res.status(404).json(
                ApiResponse.error('Driver not found', 404)
            );
        }
        driver_name = driver.full_name;
        driver_phone = driver.phone || '';
    } else {
        return res.status(400).json(
            ApiResponse.error('driver_id is required', 400)
        );
    }

    // Generate route number
    const routeCount = await DeliveryRoute.countDocuments();
    const routeNo = `DR-${new Date().getFullYear()}-${String(routeCount + 1).padStart(4, '0')}`;

    const route = await DeliveryRoute.create({
        _id: `route_${Date.now()}`,
        route_no: routeNo,
        route_name,
        driver_name,
        driver_phone,
        vehicle_no,
        vehicle_type,
        planned_date: planned_date || new Date(),
        total_distance_km: total_distance_km || 0,
        estimated_duration_mins: estimated_duration_mins || 0,
        status: 'PLANNED',
        created_by: req.user.id
    });

    const populatedRoute = await DeliveryRoute.findById(route._id)
        .populate('created_by', 'username full_name');

    return res.status(201).json(
        ApiResponse.success(populatedRoute, 'Delivery route created successfully', 201)
    );
});

// @desc    Update delivery route
// @route   PUT /api/delivery-routes/:id
// @access  Private (Supply Coordinator, Manager, Admin)
exports.updateDeliveryRoute = asyncHandler(async (req, res) => {
    const route = await DeliveryRoute.findById(req.params.id);

    if (!route) {
        return res.status(404).json(
            ApiResponse.error('Delivery route not found', 404)
        );
    }

    const {
        route_name,
        driver_name,
        driver_phone,
        vehicle_no,
        vehicle_type,
        planned_date,
        total_distance_km,
        estimated_duration_mins
    } = req.body;

    if (route_name) route.route_name = route_name;
    if (driver_name) route.driver_name = driver_name;
    if (driver_phone) route.driver_phone = driver_phone;
    if (vehicle_no) route.vehicle_no = vehicle_no;
    if (vehicle_type) route.vehicle_type = vehicle_type;
    if (planned_date) route.planned_date = planned_date;
    if (total_distance_km !== undefined) route.total_distance_km = total_distance_km;
    if (estimated_duration_mins !== undefined) route.estimated_duration_mins = estimated_duration_mins;

    route.updated_at = new Date();
    await route.save();

    const populatedRoute = await DeliveryRoute.findById(route._id)
        .populate('created_by', 'username full_name');

    return res.status(200).json(
        ApiResponse.success(populatedRoute, 'Delivery route updated successfully')
    );
});

// @desc    Update delivery route status
// @route   PUT /api/delivery-routes/:id/status
// @access  Private (Supply Coordinator, Manager, Admin)
exports.updateRouteStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const validStatuses = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

    if (!validStatuses.includes(status)) {
        return res.status(400).json(
            ApiResponse.error('Invalid status', 400)
        );
    }

    const route = await DeliveryRoute.findById(req.params.id);

    if (!route) {
        return res.status(404).json(
            ApiResponse.error('Delivery route not found', 404)
        );
    }

    route.status = status;

    // Set actual times based on status
    if (status === 'IN_PROGRESS' && !route.actual_start_time) {
        route.actual_start_time = new Date();
    }
    if (status === 'COMPLETED' && !route.actual_end_time) {
        route.actual_end_time = new Date();
    }

    route.updated_at = new Date();
    await route.save();

    const populatedRoute = await DeliveryRoute.findById(route._id)
        .populate('created_by', 'username full_name');

    return res.status(200).json(
        ApiResponse.success(populatedRoute, 'Route status updated successfully')
    );
});

// @desc    Add stop to route
// @route   POST /api/delivery-routes/:id/stops
// @access  Private (Supply Coordinator, Manager, Admin)
exports.addRouteStop = asyncHandler(async (req, res) => {
    const route = await DeliveryRoute.findById(req.params.id);

    if (!route) {
        return res.status(404).json(
            ApiResponse.error('Delivery route not found', 404)
        );
    }

    const {
        store_org_unit_id,
        shipment_ids,
        estimated_arrival,
        estimated_departure,
        notes
    } = req.body;

    // Get next sequence number
    const existingStops = await RouteStop.find({ route_id: route._id });
    const sequence = existingStops.length + 1;

    const stop = await RouteStop.create({
        _id: `stop_${Date.now()}`,
        route_id: route._id,
        sequence,
        store_org_unit_id,
        shipment_ids: shipment_ids || [],
        estimated_arrival,
        estimated_departure,
        notes: notes || '',
        status: 'PENDING'
    });

    const populatedStop = await RouteStop.findById(stop._id)
        .populate('store_org_unit_id', 'name code address')
        .populate('shipment_ids', 'shipment_no status');

    return res.status(201).json(
        ApiResponse.success(populatedStop, 'Route stop added successfully', 201)
    );
});

// @desc    Get my delivery routes (for drivers)
// @route   GET /api/delivery-routes/my-routes/list
// @access  Private (Driver)
exports.getMyRoutes = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get current user
    const user = await AppUser.findById(req.user.id);
    if (!user) {
        return res.status(404).json(
            ApiResponse.error('User not found', 404)
        );
    }

    // Filter by driver name (current user)
    const { status } = req.query;
    const filter = { driver_name: user.full_name };
    if (status) filter.status = status;

    // Get routes assigned to this driver
    const routes = await DeliveryRoute.find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ planned_date: -1 });

    // Get stops for each route
    const routesWithStops = await Promise.all(
        routes.map(async (route) => {
            const stops = await RouteStop.find({ route_id: route._id })
                .populate('store_org_unit_id', 'name code address')
                .populate('shipment_ids', 'shipment_no status')
                .sort({ sequence: 1 });
            
            return {
                ...route.toObject(),
                stops
            };
        })
    );

    const total = await DeliveryRoute.countDocuments(filter);

    return res.status(200).json(
        ApiResponse.paginate(routesWithStops, page, limit, total)
    );
});

// @desc    Update stop status
// @route   PUT /api/delivery-routes/:id/stops/:stopId/status
// @access  Private (Supply Coordinator, Manager, Admin)
exports.updateStopStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const validStatuses = ['PENDING', 'ARRIVED', 'COMPLETED', 'SKIPPED'];

    if (!validStatuses.includes(status)) {
        return res.status(400).json(
            ApiResponse.error('Invalid status', 400)
        );
    }

    // Check route exists & status = IN_PROGRESS
    const route = await DeliveryRoute.findById(req.params.id);
    if (!route) {
        return res.status(404).json(
            ApiResponse.error('Delivery route not found', 404)
        );
    }

    if (route.status !== 'IN_PROGRESS') {
        return res.status(400).json(
            ApiResponse.error('Route must be IN_PROGRESS to update stop status', 400)
        );
    }

    const stop = await RouteStop.findById(req.params.stopId);

    if (!stop) {
        return res.status(404).json(
            ApiResponse.error('Route stop not found', 404)
        );
    }

    if (stop.route_id !== req.params.id) {
        return res.status(400).json(
            ApiResponse.error('Stop does not belong to this route', 400)
        );
    }

    // Check workflow order: PENDING → ARRIVED → COMPLETED → SKIPPED
    const statusOrder = { 'PENDING': 0, 'ARRIVED': 1, 'COMPLETED': 2, 'SKIPPED': 2 };
    if (statusOrder[status] <= statusOrder[stop.status] && stop.status !== 'PENDING') {
        return res.status(400).json(
            ApiResponse.error(`Cannot transition from ${stop.status} to ${status}. Valid: PENDING→ARRIVED→COMPLETED|SKIPPED`, 400)
        );
    }

    stop.status = status;

    // Set actual times based on status
    if (status === 'ARRIVED' && !stop.actual_arrival) {
        stop.actual_arrival = new Date();
    }
    if (status === 'COMPLETED' && !stop.actual_departure) {
        stop.actual_departure = new Date();
    }

    // Handle delivery photo upload
    if (status === 'COMPLETED' && req.file) {
        stop.delivery_photo_url = req.file.secure_url || req.file.url || req.file.path;
        stop.delivery_photo_uploaded_at = new Date();
    }

    await stop.save();

    const populatedStop = await RouteStop.findById(stop._id)
        .populate('store_org_unit_id', 'name code address')
        .populate('shipment_ids', 'shipment_no status');

    return res.status(200).json(
        ApiResponse.success(populatedStop, 'Stop status updated successfully')
    );
});
