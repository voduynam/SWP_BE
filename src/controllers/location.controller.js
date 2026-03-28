const asyncHandler = require('../utils/asyncHandler');
const OrgUnit = require('../models/OrgUnit');
const Location = require('../models/Location');
const UserLocation = require('../models/UserLocation');
const ApiResponse = require('../utils/ApiResponse');

// @desc    Update organization unit coordinates (Store/Kitchen location)
// @route   PUT /api/locations/org-unit/:id/coordinates
// @access  Private (Store Staff for own store, Admin/Manager for all)
exports.updateOrgUnitCoordinates = asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json(
      ApiResponse.error('Latitude and longitude are required', 400)
    );
  }

  // Validate coordinates
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return res.status(400).json(
      ApiResponse.error('Invalid coordinates', 400)
    );
  }

  const orgUnit = await OrgUnit.findById(req.params.id);
  if (!orgUnit) {
    return res.status(404).json(
      ApiResponse.error('Organization unit not found', 404)
    );
  }

  // Check permissions
  const canEdit = req.user.roles.includes('ADMIN') || 
                  req.user.roles.includes('MANAGER') ||
                  (req.user.roles.includes('STORE_STAFF') && req.user.org_unit_id === orgUnit._id);

  if (!canEdit) {
    return res.status(403).json(
      ApiResponse.error('Access denied', 403)
    );
  }

  // Update coordinates
  orgUnit.coordinates = { latitude, longitude };
  await orgUnit.save();

  return res.status(200).json(
    ApiResponse.success(orgUnit, 'Organization unit coordinates updated successfully')
  );
});

// @desc    Get organization units with coordinates for map view
// @route   GET /api/locations/org-units
// @access  Private
exports.getOrgUnitsForMap = asyncHandler(async (req, res) => {
  const { type } = req.query; // 'STORE' or 'KITCHEN'
  
  const filter = {};
  if (type) filter.type = type;

  // Apply role-based filtering
  if (req.user.roles.includes('STORE_STAFF') && !req.user.roles.includes('ADMIN') && !req.user.roles.includes('MANAGER')) {
    // Store staff can only see their own store and kitchen locations
    filter.$or = [
      { _id: req.user.org_unit_id },
      { type: 'KITCHEN' }
    ];
  }

  const orgUnits = await OrgUnit.find(filter)
    .select('_id type code name address district city coordinates status');

  // Filter only units with coordinates for map display
  const unitsWithCoordinates = orgUnits.filter(unit => 
    unit.coordinates && unit.coordinates.latitude && unit.coordinates.longitude
  );

  return res.status(200).json(
    ApiResponse.success({
      total: unitsWithCoordinates.length,
      locations: unitsWithCoordinates
    }, 'Organization units retrieved successfully')
  );
});

// @desc    Update user's current location
// @route   POST /api/locations/user-location
// @access  Private
exports.updateUserLocation = asyncHandler(async (req, res) => {
  const { latitude, longitude, accuracy } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json(
      ApiResponse.error('Latitude and longitude are required', 400)
    );
  }

  // Validate coordinates
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return res.status(400).json(
      ApiResponse.error('Invalid coordinates', 400)
    );
  }

  // Deactivate previous active location
  await UserLocation.updateMany(
    { user_id: req.user.id, is_active: true },
    { is_active: false }
  );

  // Create new active location
  const userLocation = await UserLocation.create({
    _id: `user_loc_${req.user.id}_${Date.now()}`,
    user_id: req.user.id,
    coordinates: { latitude, longitude },
    accuracy: accuracy || 0,
    timestamp: new Date(),
    is_active: true
  });

  return res.status(201).json(
    ApiResponse.success(userLocation, 'User location updated successfully', 201)
  );
});

// @desc    Get user's current location
// @route   GET /api/locations/user-location/:userId?
// @access  Private
exports.getUserLocation = asyncHandler(async (req, res) => {
  const targetUserId = req.params.userId || req.user.id;

  // Check permissions - users can see their own location, admin/manager can see all
  const canView = targetUserId === req.user.id ||
                  req.user.roles.includes('ADMIN') ||
                  req.user.roles.includes('MANAGER') ||
                  req.user.roles.includes('SUPPLY_COORDINATOR');

  if (!canView) {
    return res.status(403).json(
      ApiResponse.error('Access denied', 403)
    );
  }

  const userLocation = await UserLocation.findOne({
    user_id: targetUserId,
    is_active: true
  }).populate('user_id', 'username full_name');

  if (!userLocation) {
    return res.status(404).json(
      ApiResponse.error('User location not found', 404)
    );
  }

  return res.status(200).json(
    ApiResponse.success(userLocation, 'User location retrieved successfully')
  );
});

// @desc    Get delivery route with waypoints for shipper
// @route   GET /api/locations/delivery-route/:routeId
// @access  Private (Driver, Supply Coordinator, Admin, Manager)
exports.getDeliveryRoute = asyncHandler(async (req, res) => {
  const { routeId } = req.params;

  // Check permissions
  const canView = req.user.roles.includes('DRIVER') ||
                  req.user.roles.includes('SUPPLY_COORDINATOR') ||
                  req.user.roles.includes('ADMIN') ||
                  req.user.roles.includes('MANAGER');

  if (!canView) {
    return res.status(403).json(
      ApiResponse.error('Access denied', 403)
    );
  }

  // Get delivery route with stops
  const DeliveryRoute = require('../models/DeliveryRoute');
  const RouteStop = require('../models/RouteStop');

  const route = await DeliveryRoute.findById(routeId);
  if (!route) {
    return res.status(404).json(
      ApiResponse.error('Delivery route not found', 404)
    );
  }

  // Get route stops with shipment and destination info
  const stops = await RouteStop.find({ route_id: routeId })
    .populate({
      path: 'shipment_ids',
      populate: {
        path: 'to_location_id',
        select: 'name coordinates'
      }
    })
    .sort({ stop_order: 1 });

  // Build waypoints for map
  const waypoints = [];
  
  for (const stop of stops) {
    for (const shipment of stop.shipment_ids) {
      if (shipment.to_location_id && shipment.to_location_id.coordinates) {
        waypoints.push({
          stop_id: stop._id,
          shipment_id: shipment._id,
          location_name: shipment.to_location_id.name,
          coordinates: shipment.to_location_id.coordinates,
          stop_order: stop.stop_order,
          status: stop.status
        });
      }
    }
  }

  return res.status(200).json(
    ApiResponse.success({
      route: route,
      waypoints: waypoints,
      total_stops: waypoints.length
    }, 'Delivery route retrieved successfully')
  );
});

// @desc    Get nearby locations (for reference)
// @route   GET /api/locations/nearby
// @access  Private
exports.getNearbyLocations = asyncHandler(async (req, res) => {
  const { latitude, longitude, radius = 5000 } = req.query; // radius in meters, default 5km

  if (!latitude || !longitude) {
    return res.status(400).json(
      ApiResponse.error('Latitude and longitude are required', 400)
    );
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const radiusInKm = parseFloat(radius) / 1000;

  // Simple distance calculation (for basic proximity)
  // In production, you might want to use MongoDB's geospatial queries
  const orgUnits = await OrgUnit.find({
    coordinates: { $exists: true },
    'coordinates.latitude': { $exists: true },
    'coordinates.longitude': { $exists: true }
  }).select('_id type code name address coordinates');

  const nearbyUnits = orgUnits.filter(unit => {
    const distance = calculateDistance(
      lat, lng,
      unit.coordinates.latitude, unit.coordinates.longitude
    );
    return distance <= radiusInKm;
  }).map(unit => ({
    ...unit.toObject(),
    distance: calculateDistance(lat, lng, unit.coordinates.latitude, unit.coordinates.longitude)
  })).sort((a, b) => a.distance - b.distance);

  return res.status(200).json(
    ApiResponse.success({
      center: { latitude: lat, longitude: lng },
      radius_km: radiusInKm,
      total: nearbyUnits.length,
      locations: nearbyUnits
    }, 'Nearby locations retrieved successfully')
  );
});

// @desc    Get coordinates from address using geocoding
// @route   GET /api/locations/geocode
// @access  Private
exports.geocodeAddress = asyncHandler(async (req, res) => {
  const { address } = req.query;

  if (!address) {
    return res.status(400).json(
      ApiResponse.error('Address parameter is required', 400)
    );
  }

  try {
    // For demo purposes, we'll use a simple geocoding approach
    // In production, you would use Google Geocoding API or similar service
    
    // Sample coordinates for common Vietnam locations
    const vietnamLocations = {
      'quan 1': { lat: 10.7769, lng: 106.7009, formatted: 'Quận 1, Hồ Chí Minh' },
      'district 1': { lat: 10.7769, lng: 106.7009, formatted: 'District 1, Ho Chi Minh City' },
      'tan binh': { lat: 10.7829, lng: 106.6957, formatted: 'Tân Bình, Hồ Chí Minh' },
      'district 3': { lat: 10.7860, lng: 106.6917, formatted: 'District 3, Ho Chi Minh City' },
      'binh thanh': { lat: 10.8142, lng: 106.7106, formatted: 'Bình Thạnh, Hồ Chí Minh' },
      'thu duc': { lat: 10.8471, lng: 106.7620, formatted: 'Thủ Đức, Hồ Chí Minh' },
      'go vap': { lat: 10.8376, lng: 106.6765, formatted: 'Gò Vấp, Hồ Chí Minh' }
    };

    // Simple matching logic
    const searchKey = address.toLowerCase().trim();
    let result = null;

    // Try to find exact match or partial match
    for (const [key, coords] of Object.entries(vietnamLocations)) {
      if (searchKey.includes(key) || key.includes(searchKey)) {
        result = coords;
        break;
      }
    }

    if (!result) {
      // Default to Ho Chi Minh City center if no match found
      result = { 
        lat: 10.7769, 
        lng: 106.7009, 
        formatted: 'Ho Chi Minh City (Default)',
        note: 'No exact match found, showing city center. Please adjust coordinates manually.'
      };
    }

    return res.status(200).json(
      ApiResponse.success({
        address: address,
        coordinates: {
          latitude: result.lat,
          longitude: result.lng
        },
        formatted_address: result.formatted,
        note: result.note || 'Coordinates found based on address',
        google_maps_link: `https://www.google.com/maps/search/?api=1&query=${result.lat},${result.lng}`,
        // Link to open Google Maps for manual adjustment
        edit_location_link: `https://www.google.com/maps/@${result.lat},${result.lng},15z`
      }, 'Address geocoded successfully')
    );

  } catch (error) {
    return res.status(500).json(
      ApiResponse.error('Geocoding failed: ' + error.message, 500)
    );
  }
});

// @desc    Get current location using browser geolocation (for mobile staff)
// @route   POST /api/locations/current-location
// @access  Private
exports.setCurrentLocation = asyncHandler(async (req, res) => {
  const { latitude, longitude, accuracy, address_hint } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json(
      ApiResponse.error('Latitude and longitude are required', 400)
    );
  }

  // Validate coordinates
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return res.status(400).json(
      ApiResponse.error('Invalid coordinates', 400)
    );
  }

  // Check if user has permission to update their org unit location
  const canUpdate = req.user.roles.includes('ADMIN') || 
                    req.user.roles.includes('MANAGER') ||
                    req.user.roles.includes('STORE_STAFF');

  if (!canUpdate) {
    return res.status(403).json(
      ApiResponse.error('Access denied', 403)
    );
  }

  // Update user's org unit coordinates if they're staff
  if (req.user.roles.includes('STORE_STAFF') && req.user.org_unit_id) {
    const orgUnit = await OrgUnit.findById(req.user.org_unit_id);
    if (orgUnit) {
      orgUnit.coordinates = { latitude, longitude };
      await orgUnit.save();
    }
  }

  // Also save to user location tracking
  await UserLocation.updateMany(
    { user_id: req.user.id, is_active: true },
    { is_active: false }
  );

  const userLocation = await UserLocation.create({
    _id: `user_loc_${req.user.id}_${Date.now()}`,
    user_id: req.user.id,
    coordinates: { latitude, longitude },
    accuracy: accuracy || 0,
    timestamp: new Date(),
    is_active: true
  });

  return res.status(200).json(
    ApiResponse.success({
      user_location: userLocation,
      org_unit_updated: req.user.roles.includes('STORE_STAFF'),
      coordinates: { latitude, longitude },
      accuracy: accuracy || 0,
      address_hint: address_hint || '',
      google_maps_link: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
      google_maps_directions: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
    }, 'Current location set successfully')
  );
});

// @desc    Get Google Maps links for locations
// @route   GET /api/locations/google-maps-links
// @access  Private
exports.getGoogleMapsLinks = asyncHandler(async (req, res) => {
  const { org_unit_id } = req.query;
  
  const filter = {};
  if (org_unit_id) filter._id = org_unit_id;

  // Apply role-based filtering
  if (req.user.roles.includes('STORE_STAFF') && !req.user.roles.includes('ADMIN') && !req.user.roles.includes('MANAGER')) {
    // Store staff can only see their own store and kitchen locations
    filter.$or = [
      { _id: req.user.org_unit_id },
      { type: 'KITCHEN' }
    ];
  }

  const orgUnits = await OrgUnit.find(filter)
    .select('_id type code name address district city coordinates status');

  // Filter only units with coordinates and generate Google Maps links
  const locationsWithMaps = orgUnits
    .filter(unit => unit.coordinates && unit.coordinates.latitude && unit.coordinates.longitude)
    .map(unit => {
      const lat = unit.coordinates.latitude;
      const lng = unit.coordinates.longitude;
      const locationName = encodeURIComponent(`${unit.name} - ${unit.address || ''}`);
      
      return {
        _id: unit._id,
        type: unit.type,
        code: unit.code,
        name: unit.name,
        address: unit.address,
        district: unit.district,
        city: unit.city,
        coordinates: unit.coordinates,
        status: unit.status,
        google_maps_link: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${locationName}`,
        google_maps_directions: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
        google_maps_embed: `https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${lat},${lng}&zoom=15`
      };
    });

  return res.status(200).json(
    ApiResponse.success({
      total: locationsWithMaps.length,
      locations: locationsWithMaps
    }, 'Google Maps links generated successfully')
  );
});