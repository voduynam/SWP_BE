const asyncHandler = require('../utils/asyncHandler');
const AppUser = require('../models/AppUser');
const UserRole = require('../models/UserRole');
const Role = require('../models/Role');
const OrgUnit = require('../models/OrgUnit');
const { generateToken } = require('../utils/jwt');
const ApiResponse = require('../utils/ApiResponse');

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public (should be Admin only in production)
exports.register = asyncHandler(async (req, res) => {
  const { _id, org_unit_id, username, password, full_name, role_ids } = req.body;

  // Check if user exists
  const existingUser = await AppUser.findOne({ username });
  if (existingUser) {
    return res.status(400).json(
      ApiResponse.error('Username already exists', 400)
    );
  }

  // Check if org_unit exists
  const orgUnit = await OrgUnit.findById(org_unit_id);
  if (!orgUnit) {
    return res.status(400).json(
      ApiResponse.error('Organization unit not found', 400)
    );
  }

  // Create user
  const user = await AppUser.create({
    _id: _id || `user_${Date.now()}`,
    org_unit_id,
    username,
    password,
    full_name,
    status: 'ACTIVE'
  });

  // Assign roles
  if (role_ids && role_ids.length > 0) {
    const roleAssignments = role_ids.map(role_id => ({
      user_id: user._id,
      role_id
    }));
    await UserRole.insertMany(roleAssignments);
  }

  // Generate token
  const token = generateToken({
    id: user._id,
    username: user.username,
    org_unit_id: user.org_unit_id
  });

  return res.status(201).json(
    ApiResponse.success({
      token,
      user: {
        id: user._id,
        username: user.username,
        full_name: user.full_name,
        org_unit_id: user.org_unit_id
      }
    }, 'User registered successfully', 201)
  );
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json(
      ApiResponse.error('Please provide username and password', 400)
    );
  }

  // Find user and include password
  const user = await AppUser.findOne({ username }).select('+password');
  if (!user) {
    return res.status(401).json(
      ApiResponse.error('Invalid credentials', 401)
    );
  }

  // Check if user is active
  if (user.status !== 'ACTIVE') {
    return res.status(401).json(
      ApiResponse.error('User account is inactive', 401)
    );
  }

  // Verify password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json(
      ApiResponse.error('Invalid credentials', 401)
    );
  }

  // Get user roles
  const userRoles = await UserRole.find({ user_id: user._id });
  const roleIds = userRoles.map(ur => ur.role_id);
  const roles = await Role.find({ _id: { $in: roleIds } });

  // Generate token
  const token = generateToken({
    id: user._id,
    username: user.username,
    org_unit_id: user.org_unit_id,
    roles: roles.map(r => r.code)
  });

  return res.status(200).json(
    ApiResponse.success({
      token,
      user: {
        id: user._id,
        username: user.username,
        full_name: user.full_name,
        org_unit_id: user.org_unit_id,
        roles: roles.map(r => ({ id: r._id, code: r.code, name: r.name }))
      }
    }, 'Login successful')
  );
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res) => {
  const user = await AppUser.findById(req.user.id);
  if (!user) {
    return res.status(404).json(
      ApiResponse.error('User not found', 404)
    );
  }

  // Get user roles
  const userRoles = await UserRole.find({ user_id: user._id });
  const roleIds = userRoles.map(ur => ur.role_id);
  const roles = await Role.find({ _id: { $in: roleIds } });

  // Get org unit
  const orgUnit = await OrgUnit.findById(user.org_unit_id);

  return res.status(200).json(
    ApiResponse.success({
      id: user._id,
      username: user.username,
      full_name: user.full_name,
      org_unit_id: user.org_unit_id,
      org_unit: orgUnit,
      status: user.status,
      roles: roles.map(r => ({ id: r._id, code: r.code, name: r.name }))
    })
  );
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res) => {
  // Since we're using JWT, logout is handled on the client side
  // by removing the token from storage
  // This endpoint is here for consistency and can be used for logging purposes
  
  return res.status(200).json(
    ApiResponse.success(null, 'Logout successful')
  );
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json(
      ApiResponse.error('Please provide current password and new password', 400)
    );
  }

  // Validate new password length
  if (new_password.length < 6) {
    return res.status(400).json(
      ApiResponse.error('New password must be at least 6 characters', 400)
    );
  }

  // Get user with password
  const user = await AppUser.findById(req.user.id).select('+password');
  if (!user) {
    return res.status(404).json(
      ApiResponse.error('User not found', 404)
    );
  }

  // Verify current password
  const isMatch = await user.comparePassword(current_password);
  if (!isMatch) {
    return res.status(401).json(
      ApiResponse.error('Current password is incorrect', 401)
    );
  }

  // Update password
  user.password = new_password;
  await user.save();

  return res.status(200).json(
    ApiResponse.success(null, 'Password changed successfully')
  );
});

// @desc    Reset password (Admin only)
// @route   PUT /api/auth/reset-password/:userId
// @access  Private/Admin
exports.resetPassword = asyncHandler(async (req, res) => {
  const { new_password } = req.body;

  if (!new_password) {
    return res.status(400).json(
      ApiResponse.error('Please provide new password', 400)
    );
  }

  // Validate new password length
  if (new_password.length < 6) {
    return res.status(400).json(
      ApiResponse.error('New password must be at least 6 characters', 400)
    );
  }

  // Get user
  const user = await AppUser.findById(req.params.userId).select('+password');
  if (!user) {
    return res.status(404).json(
      ApiResponse.error('User not found', 404)
    );
  }

  // Update password
  user.password = new_password;
  await user.save();

  return res.status(200).json(
    ApiResponse.success(null, 'Password reset successfully')
  );
});
