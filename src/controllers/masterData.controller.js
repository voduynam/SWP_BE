const asyncHandler = require('../utils/asyncHandler');
const UOM = require('../models/UOM');
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');
const OrgUnit = require('../models/OrgUnit');
const Location = require('../models/Location');
const Role = require('../models/Role');
const ApiResponse = require('../utils/ApiResponse');

// ========== UOM ==========
exports.getUOMs = asyncHandler(async (req, res) => {
  const uoms = await UOM.find().sort({ code: 1 });
  return res.status(200).json(ApiResponse.success(uoms));
});

exports.getUOM = asyncHandler(async (req, res) => {
  const uom = await UOM.findById(req.params.id);
  if (!uom) {
    return res.status(404).json(ApiResponse.error('UOM not found', 404));
  }
  return res.status(200).json(ApiResponse.success(uom));
});

// ========== Categories ==========
exports.getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ name: 1 });
  return res.status(200).json(ApiResponse.success(categories));
});

exports.getCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    return res.status(404).json(ApiResponse.error('Category not found', 404));
  }
  return res.status(200).json(ApiResponse.success(category));
});

exports.createCategory = asyncHandler(async (req, res) => {
  const { _id, name, parent_id } = req.body;
  const category = await Category.create({
    _id: _id || `cat_${Date.now()}`,
    name,
    parent_id: parent_id || null
  });
  return res.status(201).json(ApiResponse.success(category, 'Category created successfully', 201));
});

// ========== Suppliers ==========
exports.getSuppliers = asyncHandler(async (req, res) => {
  const suppliers = await Supplier.find().sort({ name: 1 });
  return res.status(200).json(ApiResponse.success(suppliers));
});

exports.getSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) {
    return res.status(404).json(ApiResponse.error('Supplier not found', 404));
  }
  return res.status(200).json(ApiResponse.success(supplier));
});

exports.createSupplier = asyncHandler(async (req, res) => {
  const { _id, name, tax_code, address } = req.body;
  const supplier = await Supplier.create({
    _id: _id || `sup_${Date.now()}`,
    name,
    tax_code,
    address
  });
  return res.status(201).json(ApiResponse.success(supplier, 'Supplier created successfully', 201));
});

// ========== Org Units ==========
exports.getOrgUnits = asyncHandler(async (req, res) => {
  const { type, status } = req.query;
  const filter = {};
  if (type) filter.type = type;
  if (status) filter.status = status;
  
  const orgUnits = await OrgUnit.find(filter).sort({ name: 1 });
  return res.status(200).json(ApiResponse.success(orgUnits));
});

exports.getOrgUnit = asyncHandler(async (req, res) => {
  const orgUnit = await OrgUnit.findById(req.params.id);
  if (!orgUnit) {
    return res.status(404).json(ApiResponse.error('Organization unit not found', 404));
  }
  return res.status(200).json(ApiResponse.success(orgUnit));
});

exports.createOrgUnit = asyncHandler(async (req, res) => {
  const { _id, type, code, name, address, district, city } = req.body;
  const orgUnit = await OrgUnit.create({
    _id: _id || `org_${Date.now()}`,
    type,
    code,
    name,
    address,
    district,
    city,
    status: 'ACTIVE'
  });
  return res.status(201).json(ApiResponse.success(orgUnit, 'Organization unit created successfully', 201));
});

// ========== Locations ==========
exports.getLocations = asyncHandler(async (req, res) => {
  const { org_unit_id, status } = req.query;
  const filter = {};
  if (org_unit_id) filter.org_unit_id = org_unit_id;
  if (status) filter.status = status;

  // Không truyền org_unit_id = lấy tất cả kho (dropdown Kho nhận cần thấy đủ). Có truyền org_unit_id thì user không thuộc nhóm quyền chỉ xem org của mình.
  const hasOrgFilter = !!org_unit_id;
  if (hasOrgFilter) {
    const canAccessAnyOrg = Array.isArray(req.user.roles) && (
      req.user.roles.includes('ADMIN') ||
      req.user.roles.includes('MANAGER') ||
      req.user.roles.includes('CHEF') ||
      req.user.roles.includes('SUPPLY_COORDINATOR')
    );
    if (!canAccessAnyOrg) filter.org_unit_id = req.user.org_unit_id;
  }

  const locations = await Location.find(filter)
    .populate('org_unit_id', 'name code type')
    .sort({ name: 1 });
  return res.status(200).json(ApiResponse.success(locations));
});

exports.getLocation = asyncHandler(async (req, res) => {
  const location = await Location.findById(req.params.id)
    .populate('org_unit_id', 'name code type');
  if (!location) {
    return res.status(404).json(ApiResponse.error('Location not found', 404));
  }
  return res.status(200).json(ApiResponse.success(location));
});

exports.createLocation = asyncHandler(async (req, res) => {
  const { _id, org_unit_id, code, name } = req.body;
  const location = await Location.create({
    _id: _id || `loc_${Date.now()}`,
    org_unit_id,
    code,
    name,
    status: 'ACTIVE'
  });
  const populated = await Location.findById(location._id)
    .populate('org_unit_id', 'name code type');
  return res.status(201).json(ApiResponse.success(populated, 'Location created successfully', 201));
});

// Tạo sẵn OrgUnit + Location "Kho Q1" (Cửa hàng Quận 1) nếu chưa có – dùng cho dropdown Kho nhận
exports.seedStoreLocations = asyncHandler(async (req, res) => {
  const created = { orgUnits: [], locations: [] };

  const ensure = async ({ orgId, orgCode, orgName, locId, locCode, locName }) => {
    let org = await OrgUnit.findById(orgId);
    if (!org) {
      org = await OrgUnit.create({
        _id: orgId,
        type: 'STORE',
        code: orgCode,
        name: orgName,
        address: '',
        district: '',
        city: '',
        status: 'ACTIVE',
      });
      created.orgUnits.push(org);
    }
    let loc = await Location.findById(locId);
    if (!loc) {
      loc = await Location.create({
        _id: locId,
        org_unit_id: orgId,
        code: locCode,
        name: locName,
        status: 'ACTIVE',
      });
      created.locations.push(loc);
    }
  };

  await ensure({
    orgId: 'org_store_q1',
    orgCode: 'STORE_Q1',
    orgName: 'Cửa hàng Quận 1',
    locId: 'loc_str_q1',
    locCode: 'WH_STR_Q1',
    locName: 'Kho Q1',
  });

  const message =
    created.orgUnits.length || created.locations.length
      ? `Đã tạo ${created.orgUnits.length} đơn vị, ${created.locations.length} kho (Kho Q1).`
      : 'Kho cửa hàng đã tồn tại.';
  return res.status(200).json(ApiResponse.success(created, message));
});

// ========== Roles ==========
exports.getRoles = asyncHandler(async (req, res) => {
  const roles = await Role.find().sort({ code: 1 });
  return res.status(200).json(ApiResponse.success(roles));
});

exports.getRole = asyncHandler(async (req, res) => {
  const role = await Role.findById(req.params.id);
  if (!role) {
    return res.status(404).json(ApiResponse.error('Role not found', 404));
  }
  return res.status(200).json(ApiResponse.success(role));
});
