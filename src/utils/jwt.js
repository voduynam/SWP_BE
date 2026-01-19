const jwt = require('jsonwebtoken');
const config = require('../config/config');

// Generate JWT token
exports.generateToken = (payload) => {
  if (!config.jwtSecret) {
    throw new Error('JWT_SECRET is not configured. Please check your .env file');
  }
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpire
  });
};

// Verify JWT token
exports.verifyToken = (token) => {
  try {
    if (!config.jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }
    return jwt.verify(token, config.jwtSecret);
  } catch (error) {
    return null;
  }
};
