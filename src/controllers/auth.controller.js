const asyncHandler = require('../utils/asyncHandler');

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  // TODO: Implement user registration logic
  // - Check if user exists
  // - Hash password
  // - Create user
  // - Generate token

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      username,
      email
    }
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // TODO: Implement login logic
  // - Validate email and password
  // - Check if user exists
  // - Verify password
  // - Generate token

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      token: 'sample-jwt-token',
      user: {
        email
      }
    }
  });
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res) => {
  // TODO: Get user from JWT token

  res.status(200).json({
    success: true,
    data: {
      id: '1',
      username: 'sample_user',
      email: 'user@example.com'
    }
  });
});
