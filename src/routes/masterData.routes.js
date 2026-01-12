const express = require('express');
const router = express.Router();
const masterDataController = require('../controllers/masterData.controller');
const { protect, authorize } = require('../middlewares/auth');

// All routes require authentication
router.use(protect);

// ========== UOM Routes ==========
router.get('/uoms', masterDataController.getUOMs);
router.get('/uoms/:id', masterDataController.getUOM);

// ========== Category Routes ==========
router.get('/categories', masterDataController.getCategories);
router.get('/categories/:id', masterDataController.getCategory);
router.post('/categories', authorize('MANAGER', 'ADMIN'), masterDataController.createCategory);

// ========== Supplier Routes ==========
router.get('/suppliers', masterDataController.getSuppliers);
router.get('/suppliers/:id', masterDataController.getSupplier);
router.post('/suppliers', authorize('MANAGER', 'ADMIN'), masterDataController.createSupplier);

// ========== Org Unit Routes ==========
router.get('/org-units', masterDataController.getOrgUnits);
router.get('/org-units/:id', masterDataController.getOrgUnit);
router.post('/org-units', authorize('ADMIN'), masterDataController.createOrgUnit);

// ========== Location Routes ==========
router.get('/locations', masterDataController.getLocations);
router.get('/locations/:id', masterDataController.getLocation);
router.post('/locations', authorize('MANAGER', 'ADMIN'), masterDataController.createLocation);

// ========== Role Routes ==========
router.get('/roles', masterDataController.getRoles);
router.get('/roles/:id', masterDataController.getRole);

module.exports = router;
