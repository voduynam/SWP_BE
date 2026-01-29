const express = require('express');
const router = express.Router();
const masterDataController = require('../controllers/masterData.controller');
const { protect, authorize } = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   - name: Master Data
 *     description: Master data management (Categories, Suppliers, OrgUnits, Locations, Roles)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     OrgUnitRequest:
 *       type: object
 *       required:
 *         - type
 *         - code
 *         - name
 *       properties:
 *         _id:
 *           type: string
 *           description: Custom ID (optional, auto-generated if not provided)
 *           example: org_001
 *         type:
 *           type: string
 *           enum: [KITCHEN, STORE]
 *           description: Type of organization unit
 *           example: STORE
 *         code:
 *           type: string
 *           description: Unique code for the org unit
 *           example: STORE_HCM
 *         name:
 *           type: string
 *           description: Name of the organization unit
 *           example: Kho Hồ Chí Minh
 *         address:
 *           type: string
 *           description: Address
 *           example: 123 Nguyễn Văn Linh
 *         district:
 *           type: string
 *           example: Quận 7
 *         city:
 *           type: string
 *           example: TP. Hồ Chí Minh
 *     
 *     LocationRequest:
 *       type: object
 *       required:
 *         - org_unit_id
 *         - code
 *         - name
 *       properties:
 *         _id:
 *           type: string
 *           description: Custom ID (optional)
 *           example: loc_001
 *         org_unit_id:
 *           type: string
 *           description: Organization unit ID
 *           example: org_001
 *         code:
 *           type: string
 *           description: Unique location code
 *           example: KHO_A
 *         name:
 *           type: string
 *           description: Location name
 *           example: Kho A - Tầng 1
 */

// All routes require authentication
router.use(protect);

// ========== UOM Routes ==========

/**
 * @swagger
 * /api/master-data/uoms:
 *   get:
 *     summary: Get all units of measure
 *     tags: [Master Data]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of UOMs
 */
router.get('/uoms', masterDataController.getUOMs);

/**
 * @swagger
 * /api/master-data/uoms/{id}:
 *   get:
 *     summary: Get single unit of measure
 *     tags: [Master Data]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: UOM details
 */
router.get('/uoms/:id', masterDataController.getUOM);

// ========== Category Routes ==========

/**
 * @swagger
 * /api/master-data/categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Master Data]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get('/categories', masterDataController.getCategories);

/**
 * @swagger
 * /api/master-data/categories/{id}:
 *   get:
 *     summary: Get single category
 *     tags: [Master Data]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category details
 */
router.get('/categories/:id', masterDataController.getCategory);

/**
 * @swagger
 * /api/master-data/categories:
 *   post:
 *     summary: Create new category
 *     tags: [Master Data]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *     responses:
 *       201:
 *         description: Category created
 */
router.post('/categories', authorize('MANAGER', 'ADMIN'), masterDataController.createCategory);

// ========== Supplier Routes ==========

/**
 * @swagger
 * /api/master-data/suppliers:
 *   get:
 *     summary: Get all suppliers
 *     tags: [Master Data]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of suppliers
 */
router.get('/suppliers', masterDataController.getSuppliers);

/**
 * @swagger
 * /api/master-data/suppliers/{id}:
 *   get:
 *     summary: Get single supplier
 *     tags: [Master Data]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Supplier details
 */
router.get('/suppliers/:id', masterDataController.getSupplier);

/**
 * @swagger
 * /api/master-data/suppliers:
 *   post:
 *     summary: Create new supplier
 *     tags: [Master Data]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               contact_person:
 *                 type: string
 *     responses:
 *       201:
 *         description: Supplier created
 */
router.post('/suppliers', authorize('MANAGER', 'ADMIN'), masterDataController.createSupplier);

// ========== Org Unit Routes ==========

/**
 * @swagger
 * /api/master-data/org-units:
 *   get:
 *     summary: Get all organization units
 *     tags: [Master Data]
 *     description: Retrieve list of all organization units (stores, kitchens)
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [KITCHEN, STORE]
 *         description: Filter by organization unit type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of organization units
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *   post:
 *     summary: Create new organization unit (Admin only)
 *     tags: [Master Data]
 *     description: Create a new store or kitchen
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OrgUnitRequest'
 *           examples:
 *             store:
 *               summary: Create a store
 *               value:
 *                 type: STORE
 *                 code: STORE_HCM
 *                 name: Kho Hồ Chí Minh
 *                 address: 123 Nguyễn Văn Linh
 *                 district: Quận 7
 *                 city: TP. Hồ Chí Minh
 *             kitchen:
 *               summary: Create a kitchen
 *               value:
 *                 type: KITCHEN
 *                 code: KITCHEN_01
 *                 name: Bếp Trung Tâm
 *                 address: 456 Lê Văn Việt
 *                 district: Quận 9
 *                 city: TP. Hồ Chí Minh
 *     responses:
 *       201:
 *         description: Organization unit created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/org-units', masterDataController.getOrgUnits);
router.get('/org-units/:id', masterDataController.getOrgUnit);
router.post('/org-units', authorize('ADMIN'), masterDataController.createOrgUnit);

// ========== Location Routes ==========

/**
 * @swagger
 * /api/master-data/locations:
 *   get:
 *     summary: Get all locations
 *     tags: [Master Data]
 *     description: Retrieve list of all storage locations within organization units
 *     parameters:
 *       - in: query
 *         name: org_unit_id
 *         schema:
 *           type: string
 *         description: Filter by organization unit ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of locations
 *   post:
 *     summary: Create new location
 *     tags: [Master Data]
 *     description: Create a new storage location for an organization unit
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LocationRequest'
 *           example:
 *             org_unit_id: org_001
 *             code: KHO_A
 *             name: Kho A - Tầng 1
 *     responses:
 *       201:
 *         description: Location created successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden - Manager/Admin access required
 */
router.get('/locations', masterDataController.getLocations);
router.get('/locations/:id', masterDataController.getLocation);
router.post('/locations', authorize('MANAGER', 'ADMIN'), masterDataController.createLocation);

// ========== Role Routes ==========

/**
 * @swagger
 * /api/master-data/roles:
 *   get:
 *     summary: Get all roles
 *     tags: [Master Data]
 *     description: Retrieve list of all available roles in the system
 *     responses:
 *       200:
 *         description: List of roles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: role_admin
 *                       code:
 *                         type: string
 *                         example: ADMIN
 *                       name:
 *                         type: string
 *                         example: Administrator
 */
router.get('/roles', masterDataController.getRoles);
router.get('/roles/:id', masterDataController.getRole);

module.exports = router;
