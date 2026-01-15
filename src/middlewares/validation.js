const { body, param, query, validationResult } = require('express-validator');
const ApiResponse = require('../utils/ApiResponse');

// Middleware to handle validation errors
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(
      ApiResponse.error('Validation failed', 400, errors.array())
    );
  }
  next();
};

// Auth validations
exports.registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('full_name')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ max: 100 })
    .withMessage('Full name must not exceed 100 characters'),
  body('org_unit_id')
    .notEmpty()
    .withMessage('Organization unit is required'),
  body('role_ids')
    .isArray({ min: 1 })
    .withMessage('At least one role must be assigned')
];

exports.loginValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Item validations
exports.createItemValidation = [
  body('sku')
    .trim()
    .notEmpty()
    .withMessage('SKU is required')
    .isLength({ max: 50 })
    .withMessage('SKU must not exceed 50 characters'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Item name is required')
    .isLength({ max: 200 })
    .withMessage('Item name must not exceed 200 characters'),
  body('item_type')
    .isIn(['RAW', 'FINISHED'])
    .withMessage('Item type must be RAW or FINISHED'),
  body('base_uom_id')
    .notEmpty()
    .withMessage('Base UOM is required'),
  body('tracking_type')
    .optional()
    .isIn(['NONE', 'LOT', 'LOT_EXPIRY', 'SERIAL'])
    .withMessage('Invalid tracking type'),
  body('shelf_life_days')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Shelf life must be a positive number'),
  body('cost_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Cost price must be a positive number'),
  body('base_sell_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Sell price must be a positive number')
];

// Internal Order validations
exports.createInternalOrderValidation = [
  body('order_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid order date format'),
  body('lines')
    .isArray({ min: 1 })
    .withMessage('Order must have at least one line'),
  body('lines.*.item_id')
    .notEmpty()
    .withMessage('Item ID is required for each line'),
  body('lines.*.qty_ordered')
    .isFloat({ min: 0.01 })
    .withMessage('Quantity must be greater than 0'),
  body('lines.*.uom_id')
    .notEmpty()
    .withMessage('UOM is required for each line'),
  body('lines.*.unit_price')
    .isFloat({ min: 0 })
    .withMessage('Unit price must be a positive number')
];

exports.updateOrderStatusValidation = [
  body('status')
    .isIn(['DRAFT', 'SUBMITTED', 'APPROVED', 'PROCESSING', 'SHIPPED', 'RECEIVED', 'CANCELLED'])
    .withMessage('Invalid order status')
];

// Production Order validations
exports.createProductionOrderValidation = [
  body('planned_start')
    .isISO8601()
    .withMessage('Invalid planned start date'),
  body('planned_end')
    .isISO8601()
    .withMessage('Invalid planned end date')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.planned_start)) {
        throw new Error('Planned end must be after planned start');
      }
      return true;
    }),
  body('lines')
    .isArray({ min: 1 })
    .withMessage('Production order must have at least one line'),
  body('lines.*.item_id')
    .notEmpty()
    .withMessage('Item ID is required'),
  body('lines.*.planned_qty')
    .isFloat({ min: 0.01 })
    .withMessage('Planned quantity must be greater than 0'),
  body('lines.*.uom_id')
    .notEmpty()
    .withMessage('UOM is required')
];

// Shipment validations
exports.createShipmentValidation = [
  body('order_id')
    .notEmpty()
    .withMessage('Order ID is required'),
  body('from_location_id')
    .notEmpty()
    .withMessage('From location is required'),
  body('to_location_id')
    .notEmpty()
    .withMessage('To location is required')
    .custom((value, { req }) => {
      if (value === req.body.from_location_id) {
        throw new Error('From and To locations must be different');
      }
      return true;
    }),
  body('ship_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid ship date'),
  body('lines')
    .isArray({ min: 1 })
    .withMessage('Shipment must have at least one line'),
  body('lines.*.item_id')
    .notEmpty()
    .withMessage('Item ID is required'),
  body('lines.*.qty')
    .isFloat({ min: 0.01 })
    .withMessage('Quantity must be greater than 0'),
  body('lines.*.uom_id')
    .notEmpty()
    .withMessage('UOM is required')
];

// Goods Receipt validations
exports.createGoodsReceiptValidation = [
  body('shipment_id')
    .notEmpty()
    .withMessage('Shipment ID is required'),
  body('received_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid received date'),
  body('lines')
    .isArray({ min: 1 })
    .withMessage('Receipt must have at least one line'),
  body('lines.*.item_id')
    .notEmpty()
    .withMessage('Item ID is required'),
  body('lines.*.qty_received')
    .isFloat({ min: 0 })
    .withMessage('Received quantity must be a positive number'),
  body('lines.*.qty_rejected')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Rejected quantity must be a positive number')
];

// Recipe validations
exports.createRecipeValidation = [
  body('item_id')
    .notEmpty()
    .withMessage('Item ID is required'),
  body('version')
    .trim()
    .notEmpty()
    .withMessage('Version is required'),
  body('effective_from')
    .optional()
    .isISO8601()
    .withMessage('Invalid effective from date'),
  body('lines')
    .isArray({ min: 1 })
    .withMessage('Recipe must have at least one line'),
  body('lines.*.material_item_id')
    .notEmpty()
    .withMessage('Material item ID is required'),
  body('lines.*.qty_per_batch')
    .isFloat({ min: 0.01 })
    .withMessage('Quantity per batch must be greater than 0'),
  body('lines.*.uom_id')
    .notEmpty()
    .withMessage('UOM is required'),
  body('lines.*.scrap_rate')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Scrap rate must be between 0 and 1')
];

// Lot validations
exports.createLotValidation = [
  body('item_id')
    .notEmpty()
    .withMessage('Item ID is required'),
  body('lot_code')
    .trim()
    .notEmpty()
    .withMessage('Lot code is required')
    .isLength({ max: 50 })
    .withMessage('Lot code must not exceed 50 characters'),
  body('mfg_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid manufacturing date'),
  body('exp_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid expiry date')
    .custom((value, { req }) => {
      if (value && req.body.mfg_date && new Date(value) <= new Date(req.body.mfg_date)) {
        throw new Error('Expiry date must be after manufacturing date');
      }
      return true;
    })
];

// Inventory adjustment validations
exports.inventoryAdjustmentValidation = [
  body('location_id')
    .notEmpty()
    .withMessage('Location ID is required'),
  body('item_id')
    .notEmpty()
    .withMessage('Item ID is required'),
  body('qty')
    .isFloat()
    .withMessage('Quantity must be a number')
    .custom((value) => {
      if (value === 0) {
        throw new Error('Quantity cannot be zero');
      }
      return true;
    }),
  body('uom_id')
    .notEmpty()
    .withMessage('UOM is required'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters')
];

// Return Request validations
exports.createReturnRequestValidation = [
  body('return_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid return date'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters'),
  body('lines')
    .isArray({ min: 1 })
    .withMessage('Return request must have at least one line'),
  body('lines.*.item_id')
    .notEmpty()
    .withMessage('Item ID is required'),
  body('lines.*.qty_return')
    .isFloat({ min: 0.01 })
    .withMessage('Return quantity must be greater than 0'),
  body('lines.*.uom_id')
    .notEmpty()
    .withMessage('UOM is required'),
  body('lines.*.defect_type')
    .optional()
    .isIn(['DAMAGED', 'EXPIRED', 'WRONG_ITEM', 'QUALITY_ISSUE', 'OTHER'])
    .withMessage('Invalid defect type')
];

// Query parameter validations
exports.paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

exports.dateRangeValidation = [
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format')
];
