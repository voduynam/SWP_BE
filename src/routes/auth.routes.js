const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { protect, authorize } = require('../middlewares/auth');
const { validateLogin, validateRegister } = require('../middlewares/validator');

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and authorization APIs
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - org_unit_id
 *         - username
 *         - password
 *         - full_name
 *       properties:
 *         _id:
 *           type: string
 *           description: Custom user ID (optional, auto-generated if not provided)
 *           example: user_1234567890
 *         org_unit_id:
 *           type: string
 *           description: Organization unit ID
 *           example: org_001
 *         username:
 *           type: string
 *           description: Username for login (min 3 characters)
 *           example: johndoe
 *         password:
 *           type: string
 *           format: password
 *           description: User password (min 6 characters)
 *           example: password123
 *         full_name:
 *           type: string
 *           description: Full name of the user
 *           example: John Doe
 *         email:
 *           type: string
 *           format: email
 *           description: Email address (optional, required for password setup link)
 *           example: user@example.com
 *         phone:
 *           type: string
 *           description: Phone number (optional, 10-11 digits only)
 *           example: "0901234567"
 *         role_ids:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of role IDs to assign to the user
 *           example: ["role_admin", "role_warehouse"]
 *     
 *     LoginRequest:
 *       type: object
 *       required:
 *         - username
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           description: Username for login
 *           example: johndoe
 *         password:
 *           type: string
 *           format: password
 *           description: User password
 *           example: password123
 *     
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             token:
 *               type: string
 *               description: JWT authentication token
 *               example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *             user:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: user_1234567890
 *                 username:
 *                   type: string
 *                   example: johndoe
 *                 full_name:
 *                   type: string
 *                   example: John Doe
 *                 org_unit_id:
 *                   type: string
 *                   example: org_001
 *         message:
 *           type: string
 *           example: User registered successfully
 *         statusCode:
 *           type: integer
 *           example: 201
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user (Admin only)
 *     tags: [Authentication]
 *     description: Admin creates a new user account with organization unit and role assignments
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *           examples:
 *             example1:
 *               summary: Register admin user
 *               value:
 *                 org_unit_id: org_001
 *                 username: admin
 *                 password: admin123
 *                 full_name: Administrator
 *                 email: admin@example.com
 *                 phone: "0901234567"
 *                 role_ids: ["role_admin"]
 *             example2:
 *               summary: Register warehouse user
 *               value:
 *                 org_unit_id: org_warehouse_01
 *                 username: warehouse_user
 *                 password: warehouse123
 *                 full_name: Warehouse Manager
 *                 email: warehouse@example.com
 *                 phone: "0987654321"
 *                 role_ids: ["role_warehouse", "role_inventory"]
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Bad request - Username already exists or invalid organization unit
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               usernameExists:
 *                 summary: Username already exists
 *                 value:
 *                   success: false
 *                   message: Username already exists
 *                   statusCode: 400
 *               invalidOrgUnit:
 *                 summary: Invalid organization unit
 *                 value:
 *                   success: false
 *                   message: Organization unit not found
 *                   statusCode: 400
 *       401:
 *         description: Unauthorized - Not logged in
 *       403:
 *         description: Forbidden - Admin access required
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Authentication]
 *     description: Authenticate user and receive JWT token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           examples:
 *             example1:
 *               summary: Admin login
 *               value:
 *                 username: admin
 *                 password: admin123
 *             example2:
 *               summary: User login
 *               value:
 *                 username: johndoe
 *                 password: password123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *             example:
 *               success: true
 *               data:
 *                 token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXJfMTIzNDU2Nzg5MCIsInVzZXJuYW1lIjoiam9obmRvZSIsIm9yZ191bml0X2lkIjoib3JnXzAwMSIsImlhdCI6MTYzOTQ4MzIwMCwiZXhwIjoxNjM5NTY5NjAwfQ.example
 *                 user:
 *                   id: user_1234567890
 *                   username: johndoe
 *                   full_name: John Doe
 *                   org_unit_id: org_001
 *                   roles:
 *                     - role_id: role_admin
 *                       role_name: Administrator
 *               message: Login successful
 *               statusCode: 200
 *       400:
 *         description: Bad request - Missing credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: Please provide username and password
 *               statusCode: 400
 *       401:
 *         description: Unauthorized - Invalid credentials or inactive account
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalidCredentials:
 *                 summary: Invalid username or password
 *                 value:
 *                   success: false
 *                   message: Invalid credentials
 *                   statusCode: 401
 *               inactiveAccount:
 *                 summary: User account is inactive
 *                 value:
 *                   success: false
 *                   message: User account is inactive
 *                   statusCode: 401
 */

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public (should be Admin only in production)
router.post('/register', protect, authorize('ADMIN'), validateRegister, authController.register);

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

/**
 * @swagger
 * /api/auth/send-password-setup/{userId}:
 *   post:
 *     summary: Send password setup link (Admin only)
 *     tags: [Authentication]
 *     description: Admin sends email with password setup link to user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: user_1234567890
 *     responses:
 *       200:
 *         description: Password setup link sent successfully
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
 *                     email:
 *                       type: string
 *                       example: user@example.com
 *                     message_id:
 *                       type: string
 *                 message:
 *                   type: string
 *                   example: Password setup link sent successfully
 *       400:
 *         description: User does not have email
 *       404:
 *         description: User not found
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Failed to send email
 */
// @route   POST /api/auth/send-password-setup/:userId
// @desc    Send password setup link (Admin only)
// @access  Private/Admin
router.post('/send-password-setup/:userId', protect, authorize('ADMIN'), authController.sendPasswordSetup);

/**
 * @swagger
 * /api/auth/set-password:
 *   post:
 *     summary: Set password using token
 *     tags: [Authentication]
 *     description: User sets their password using the token received via email
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - new_password
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token from email link
 *                 example: a1b2c3d4e5f6...
 *               new_password:
 *                 type: string
 *                 format: password
 *                 description: New password (min 6 characters)
 *                 example: newpassword123
 *           example:
 *             token: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
 *             new_password: newpassword123
 *     responses:
 *       200:
 *         description: Password set successfully and user logged in
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
 *                     token:
 *                       type: string
 *                       description: JWT token for auto login
 *                     user:
 *                       type: object
 *                 message:
 *                   type: string
 *                   example: Password set successfully
 *       400:
 *         description: Invalid or expired token, or invalid password
 */
// @route   POST /api/auth/set-password
// @desc    Set password using token
// @access  Public
router.post('/set-password', authController.setPassword);

module.exports = router;
