const asyncHandler = require('../utils/asyncHandler');
const AppUser = require('../models/AppUser');
const UserRole = require('../models/UserRole');
const Role = require('../models/Role');
const OrgUnit = require('../models/OrgUnit');
const ApiResponse = require('../utils/ApiResponse');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getAllUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.org_unit_id) filter.org_unit_id = req.query.org_unit_id;
  if (req.query.status) filter.status = req.query.status;

  const users = await AppUser.find(filter)
    .populate('org_unit_id', 'name code type')
    .skip(skip)
    .limit(limit)
    .sort({ created_at: -1 });

  // Get roles for each user
  const usersWithRoles = await Promise.all(
    users.map(async (user) => {
      const userRoles = await UserRole.find({ user_id: user._id });
      const roleIds = userRoles.map(ur => ur.role_id);
      const roles = await Role.find({ _id: { $in: roleIds } });
      return {
        ...user.toObject(),
        roles: roles.map(r => ({ id: r._id, code: r.code, name: r.name }))
      };
    })
  );

  const total = await AppUser.countDocuments(filter);

  return res.status(200).json(
    ApiResponse.paginate(usersWithRoles, page, limit, total)
  );
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
exports.getUserById = asyncHandler(async (req, res) => {
  const user = await AppUser.findById(req.params.id)
    .populate('org_unit_id', 'name code type');

  if (!user) {
    return res.status(404).json(
      ApiResponse.error('User not found', 404)
    );
  }

  // Get user roles
  const userRoles = await UserRole.find({ user_id: user._id });
  const roleIds = userRoles.map(ur => ur.role_id);
  const roles = await Role.find({ _id: { $in: roleIds } });

  return res.status(200).json(
    ApiResponse.success({
      ...user.toObject(),
      roles: roles.map(r => ({ id: r._id, code: r.code, name: r.name }))
    })
  );
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private
exports.updateUser = asyncHandler(async (req, res) => {
  const user = await AppUser.findById(req.params.id);
  if (!user) {
    return res.status(404).json(
      ApiResponse.error('User not found', 404)
    );
  }

  // Check if user can update (own profile or admin/manager)
  if (req.user.id !== user._id && !req.user.roles.includes('ADMIN') && !req.user.roles.includes('MANAGER')) {
    return res.status(403).json(
      ApiResponse.error('Access denied', 403)
    );
  }

  // Update user
  const updatedUser = await AppUser.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('org_unit_id', 'name code type');

  return res.status(200).json(
    ApiResponse.success(updatedUser, 'User updated successfully')
  );
});

// @desc    Delete user (soft delete)
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await AppUser.findById(req.params.id);
  if (!user) {
    return res.status(404).json(
      ApiResponse.error('User not found', 404)
    );
  }

  // Soft delete by setting status to INACTIVE
  user.status = 'INACTIVE';
  await user.save();

  return res.status(200).json(
    ApiResponse.success(null, 'User deactivated successfully')
  );
});

// @desc    Assign roles to user
// @route   POST /api/users/:id/roles
// @access  Private/Admin
exports.assignRoles = asyncHandler(async (req, res) => {
  const { role_ids } = req.body;

  if (!role_ids || !Array.isArray(role_ids) || role_ids.length === 0) {
    return res.status(400).json(
      ApiResponse.error('Please provide an array of role IDs', 400)
    );
  }

  // Check if user exists
  const user = await AppUser.findById(req.params.id);
  if (!user) {
    return res.status(404).json(
      ApiResponse.error('User not found', 404)
    );
  }

  // Validate roles exist
  const roles = await Role.find({ _id: { $in: role_ids } });
  if (roles.length !== role_ids.length) {
    return res.status(400).json(
      ApiResponse.error('One or more roles not found', 400)
    );
  }

  // Get existing roles
  const existingUserRoles = await UserRole.find({ user_id: req.params.id });
  const existingRoleIds = existingUserRoles.map(ur => ur.role_id);

  // Filter out roles that are already assigned
  const newRoleIds = role_ids.filter(rid => !existingRoleIds.includes(rid));

  if (newRoleIds.length === 0) {
    return res.status(400).json(
      ApiResponse.error('All roles are already assigned to this user', 400)
    );
  }

  // Assign new roles
  const roleAssignments = newRoleIds.map(role_id => ({
    user_id: req.params.id,
    role_id
  }));
  await UserRole.insertMany(roleAssignments);

  // Get updated user with roles
  const updatedUserRoles = await UserRole.find({ user_id: req.params.id });
  const allRoleIds = updatedUserRoles.map(ur => ur.role_id);
  const allRoles = await Role.find({ _id: { $in: allRoleIds } });

  return res.status(200).json(
    ApiResponse.success({
      user_id: user._id,
      username: user.username,
      roles: allRoles.map(r => ({ id: r._id, code: r.code, name: r.name }))
    }, 'Roles assigned successfully')
  );
});

// @desc    Remove roles from user
// @route   DELETE /api/users/:id/roles
// @access  Private/Admin
exports.removeRoles = asyncHandler(async (req, res) => {
  const { role_ids } = req.body;

  if (!role_ids || !Array.isArray(role_ids) || role_ids.length === 0) {
    return res.status(400).json(
      ApiResponse.error('Please provide an array of role IDs', 400)
    );
  }

  // Check if user exists
  const user = await AppUser.findById(req.params.id);
  if (!user) {
    return res.status(404).json(
      ApiResponse.error('User not found', 404)
    );
  }

  // Remove roles
  const result = await UserRole.deleteMany({
    user_id: req.params.id,
    role_id: { $in: role_ids }
  });

  if (result.deletedCount === 0) {
    return res.status(400).json(
      ApiResponse.error('No roles were removed. User may not have these roles.', 400)
    );
  }

  // Get remaining user roles
  const remainingUserRoles = await UserRole.find({ user_id: req.params.id });
  const remainingRoleIds = remainingUserRoles.map(ur => ur.role_id);
  const remainingRoles = await Role.find({ _id: { $in: remainingRoleIds } });

  return res.status(200).json(
    ApiResponse.success({
      user_id: user._id,
      username: user.username,
      roles: remainingRoles.map(r => ({ id: r._id, code: r.code, name: r.name })),
      removed_count: result.deletedCount
    }, 'Roles removed successfully')
  );
});
