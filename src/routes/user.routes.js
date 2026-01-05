const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');

// @route   GET /api/users
// @desc    Get all users
// @access  Private/Admin
router.get('/', userController.getAllUsers);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', userController.getUserById);

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private
router.put('/:id', userController.updateUser);

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private/Admin
router.delete('/:id', userController.deleteUser);

module.exports = router;
