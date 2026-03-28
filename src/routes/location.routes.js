const express = require('express');
const router = express.Router();
const locationController = require('../controllers/location.controller');
const { protect, authorize } = require('../middlewares/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     Coordinates:
 *       type: object
 *       properties:
 *         latitude:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *           example: 10.7769
 *         longitude:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 *           example: 106.7009
 *     LocationResponse:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "org_store_q1"
 *         type:
 *           type: string
 *           enum: [STORE, KITCHEN]
 *           example: "STORE"
 *         name:
 *           type: string
 *           example: "Cua hang Quan 1"
 *         coordinates:
 *           $ref: '#/components/schemas/Coordinates'
 *         google_maps_link:
 *           type: string
 *           example: "https://www.google.com/maps/search/?api=1&query=10.7769,106.7009"
 */

/**
 * @swagger
 * /api/locations/org-unit/{id}/coordinates:
 *   put:
 *     summary: Update organization unit coordinates
 *     description: Staff can update their store coordinates, Admin/Manager can update any location
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization unit ID
 *         example: "org_store_q1"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Coordinates'
 *     responses:
 *       200:
 *         description: Coordinates updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Organization unit coordinates updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/LocationResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put('/org-unit/:id/coordinates', 
  protect, 
  locationController.updateOrgUnitCoordinates
);

/**
 * @swagger
 * /api/locations/org-units:
 *   get:
 *     summary: Get organization units for map view
 *     description: Get list of stores and kitchens with coordinates for map display
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [STORE, KITCHEN]
 *         description: Filter by organization type
 *     responses:
 *       200:
 *         description: Organization units retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Organization units retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 2
 *                     locations:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/LocationResponse'
 */
router.get('/org-units', 
  protect, 
  locationController.getOrgUnitsForMap
);

/**
 * @swagger
 * /api/locations/user-location:
 *   post:
 *     summary: Update user's current location
 *     description: Update user's current GPS location for tracking
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - latitude
 *               - longitude
 *             properties:
 *               latitude:
 *                 type: number
 *                 minimum: -90
 *                 maximum: 90
 *                 example: 10.7770
 *               longitude:
 *                 type: number
 *                 minimum: -180
 *                 maximum: 180
 *                 example: 106.7010
 *               accuracy:
 *                 type: number
 *                 example: 5
 *                 description: GPS accuracy in meters
 *     responses:
 *       201:
 *         description: User location updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User location updated successfully"
 */
router.post('/user-location', 
  protect, 
  locationController.updateUserLocation
);

/**
 * @swagger
 * /api/locations/user-location/{userId}:
 *   get:
 *     summary: Get user's current location
 *     description: Get current location of a specific user (own location or admin access)
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         description: User ID (optional, defaults to current user)
 *     responses:
 *       200:
 *         description: User location retrieved successfully
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/user-location/:userId?', 
  protect, 
  locationController.getUserLocation
);

/**
 * @swagger
 * /api/locations/delivery-route/{routeId}:
 *   get:
 *     summary: Get delivery route with waypoints
 *     description: Get delivery route information with waypoints for shipper navigation
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: routeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Delivery route ID
 *     responses:
 *       200:
 *         description: Delivery route retrieved successfully
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/delivery-route/:routeId', 
  protect, 
  authorize(['DRIVER', 'SUPPLY_COORDINATOR', 'ADMIN', 'MANAGER']), 
  locationController.getDeliveryRoute
);

/**
 * @swagger
 * /api/locations/nearby:
 *   get:
 *     summary: Get nearby locations
 *     description: Find locations within specified radius
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *         example: 10.7769
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *         example: 106.7009
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           default: 5000
 *         description: Search radius in meters
 *     responses:
 *       200:
 *         description: Nearby locations retrieved successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.get('/nearby', 
  protect, 
  locationController.getNearbyLocations
);

/**
 * @swagger
 * /api/locations/google-maps-links:
 *   get:
 *     summary: Get Google Maps links for locations
 *     description: Get ready-to-use Google Maps links for all accessible locations
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: org_unit_id
 *         schema:
 *           type: string
 *         description: Filter by specific organization unit
 *     responses:
 *       200:
 *         description: Google Maps links generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Google Maps links generated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 2
 *                     locations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "org_store_q1"
 *                           name:
 *                             type: string
 *                             example: "Cua hang Quan 1"
 *                           coordinates:
 *                             $ref: '#/components/schemas/Coordinates'
 *                           google_maps_link:
 *                             type: string
 *                             example: "https://www.google.com/maps/search/?api=1&query=10.7769,106.7009"
 *                           google_maps_directions:
 *                             type: string
 *                             example: "https://www.google.com/maps/dir/?api=1&destination=10.7769,106.7009"
 */
router.get('/google-maps-links', 
  protect, 
  locationController.getGoogleMapsLinks
);

/**
 * @swagger
 * /api/locations/geocode:
 *   get:
 *     summary: Convert address to coordinates
 *     description: Get coordinates from address using geocoding service
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *         description: Address to geocode
 *         example: "Tan Binh District"
 *     responses:
 *       200:
 *         description: Address geocoded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Address geocoded successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     address:
 *                       type: string
 *                       example: "Tan Binh District"
 *                     coordinates:
 *                       $ref: '#/components/schemas/Coordinates'
 *                     formatted_address:
 *                       type: string
 *                       example: "Tân Bình, Hồ Chí Minh"
 *                     google_maps_link:
 *                       type: string
 *                       example: "https://www.google.com/maps/search/?api=1&query=10.7829,106.6957"
 *                     edit_location_link:
 *                       type: string
 *                       example: "https://www.google.com/maps/@10.7829,106.6957,15z"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.get('/geocode', 
  protect, 
  locationController.geocodeAddress
);

/**
 * @swagger
 * /api/locations/current-location:
 *   post:
 *     summary: Set current location (GPS)
 *     description: Set current location using GPS coordinates and automatically update store location for staff
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - latitude
 *               - longitude
 *             properties:
 *               latitude:
 *                 type: number
 *                 minimum: -90
 *                 maximum: 90
 *                 example: 10.7860
 *               longitude:
 *                 type: number
 *                 minimum: -180
 *                 maximum: 180
 *                 example: 106.6917
 *               accuracy:
 *                 type: number
 *                 example: 10
 *                 description: GPS accuracy in meters
 *               address_hint:
 *                 type: string
 *                 example: "District 3, Ho Chi Minh City"
 *                 description: Optional address description
 *     responses:
 *       200:
 *         description: Current location set successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Current location set successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     coordinates:
 *                       $ref: '#/components/schemas/Coordinates'
 *                     org_unit_updated:
 *                       type: boolean
 *                       example: true
 *                     google_maps_link:
 *                       type: string
 *                       example: "https://www.google.com/maps/search/?api=1&query=10.7860,106.6917"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post('/current-location', 
  protect, 
  locationController.setCurrentLocation
);

module.exports = router;