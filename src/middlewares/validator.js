const { body, validationResult } = require('express-validator');

const ApiResponse = require('../utils/ApiResponse');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(
      ApiResponse.error('Validation failed', 400, errors.array())
    );
  }
  next();
};


exports.validateLogin = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

exports.validateRegister = [
  body('username')
    .trim()
    .isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('full_name')
    .trim()
    .notEmpty()
    .withMessage('Full name is required'),
  body('org_unit_id')
    .notEmpty()
    .withMessage('Organization unit is required'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9]{10,11}$/)
    .withMessage('Phone number must be 10-11 digits (no spaces or special characters)'),
  handleValidationErrors
];
