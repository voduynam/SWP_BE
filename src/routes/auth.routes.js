const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { protect, authorize } = require('../middlewares/auth');
const { validateLogin, validateRegister } = require('../middlewares/validator');

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public (should be Admin only in production)
router.post('/register', validateRegister, authController.register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', validateLogin, authController.login);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, authController.getMe);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', protect, authController.logout);

// @route   PUT /api/auth/change-password
// @desc    Change password
// @access  Private
router.put('/change-password', protect, authController.changePassword);

// @route   PUT /api/auth/reset-password/:userId
// @desc    Reset password (Admin only)
// @access  Private/Admin
router.put('/reset-password/:userId', protect, authorize('ADMIN'), authController.resetPassword);

module.exports = router;
