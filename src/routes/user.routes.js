const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { protect, authorize } = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: 12. User Management
 *   description: User management APIs (Admin only)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     UserRolesRequest:
 *       type: object
 *       required:
 *         - role_ids
 *       properties:
 *         role_ids:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of role IDs to assign/remove
 *           example: ["role_admin", "role_warehouse"]
 */

// All routes require authentication
router.use(protect);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (Admin/Manager only)
 *     tags: [12. User Management]
 *     description: Retrieve paginated list of all users with their roles
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: org_unit_id
 *         schema:
 *           type: string
 *         description: Filter by organization unit
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 *       403:
 *         description: Forbidden - Admin/Manager access required
 */
// @route   GET /api/users
// @desc    Get all users
// @access  Private/Admin
router.get('/', authorize('ADMIN', 'MANAGER'), userController.getAllUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [12. User Management]
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
 *         description: User details
 *   put:
 *     summary: Update user profile
 *     tags: [12. User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated
 *   delete:
 *     summary: Delete user (Soft delete)
 *     tags: [12. User Management]
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
 *         description: User deleted
 */
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
router.delete('/:id', authorize('ADMIN'), userController.deleteUser);

/**
 * @swagger
 * /api/users/{id}/roles:
 *   post:
 *     summary: Assign roles to user (Admin only)
 *     tags: [12. User Management]
 *     description: Assign one or more roles to a user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: user_1234567890
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRolesRequest'
 *           examples:
 *             assignAdmin:
 *               summary: Assign admin role
 *               value:
 *                 role_ids: ["role_admin"]
 *             assignMultiple:
 *               summary: Assign multiple roles
 *               value:
 *                 role_ids: ["role_warehouse", "role_inventory"]
 *     responses:
 *       200:
 *         description: Roles assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user_id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     roles:
 *                       type: array
 *                       items:
 *                         type: object
 *                 message:
 *                   type: string
 *                   example: Roles assigned successfully
 *       400:
 *         description: Bad request - Invalid role IDs or already assigned
 *       404:
 *         description: User not found
 *       403:
 *         description: Forbidden - Admin access required
 *   delete:
 *     summary: Remove roles from user (Admin only)
 *     tags: [12. User Management]
 *     description: Remove one or more roles from a user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRolesRequest'
 *           example:
 *             role_ids: ["role_warehouse"]
 *     responses:
 *       200:
 *         description: Roles removed successfully
 *       400:
 *         description: Bad request - No roles removed
 *       404:
 *         description: User not found
 *       403:
 *         description: Forbidden - Admin access required
 */
// @route   POST /api/users/:id/roles
// @desc    Assign roles to user
// @access  Private/Admin
router.post('/:id/roles', authorize('ADMIN'), userController.assignRoles);

// @route   DELETE /api/users/:id/roles
// @desc    Remove roles from user
// @access  Private/Admin
router.delete('/:id/roles', authorize('ADMIN'), userController.removeRoles);

module.exports = router;
