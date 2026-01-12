const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const AppUser = require('../models/AppUser');
const ApiResponse = require('../utils/ApiResponse');

exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json(
      ApiResponse.error('Not authorized to access this route', 401)
    );
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await AppUser.findById(decoded.id);
    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json(
        ApiResponse.error('User not found or inactive', 401)
      );
    }
    
    // Attach user info to request
    req.user = {
      id: user._id,
      username: user.username,
      org_unit_id: user.org_unit_id,
      roles: decoded.roles || []
    };
    
    next();
  } catch (error) {
    return res.status(401).json(
      ApiResponse.error('Not authorized to access this route', 401)
    );
  }
});

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.roles) {
      return res.status(403).json(
        ApiResponse.error('Access denied. No roles assigned', 403)
      );
    }

    const hasRole = roles.some(role => req.user.roles.includes(role));
    if (!hasRole) {
      return res.status(403).json(
        ApiResponse.error(`Access denied. Required roles: ${roles.join(', ')}`, 403)
      );
    }
    
    next();
  };
};
