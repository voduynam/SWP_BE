const mongoose = require('mongoose');

const performanceViolationSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  violation_type: {
    type: String,
    enum: [
      'PRODUCTION_SHORTAGE',     // Kitchen: Làm thiếu sản phẩm
      'PRODUCTION_QUALITY',      // Kitchen: Sản phẩm bị hỏng
      'PRODUCTION_DELAY',        // Kitchen: Chậm trễ sản xuất
      'COORDINATOR_ASSIGNMENT',  // Coordinator: Chậm assign driver
      'COORDINATOR_HANDOVER',    // Coordinator: Chậm giao hàng cho driver
      'DRIVER_DELAY',           // Driver: Giao hàng trễ
      'DRIVER_COD_ERROR'        // Driver: Sai sót thu tiền COD
    ],
    required: true
  },
  user_id: {
    type: String,
    required: true,
    ref: 'AppUser'
  },
  user_role: {
    type: String,
    enum: ['CHEF', 'SUPPLY_COORDINATOR', 'DRIVER'],
    required: true
  },
  reference_type: {
    type: String,
    enum: ['PRODUCTION_ORDER', 'SHIPMENT', 'DELIVERY_ROUTE', 'PAYMENT'],
    required: true
  },
  reference_id: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM'
  },
  // Violation details
  violation_data: {
    // For PRODUCTION_SHORTAGE
    planned_qty: Number,
    actual_qty: Number,
    shortage_qty: Number,
    
    // For COORDINATOR_HANDOVER
    expected_handover_time: Date,
    actual_handover_time: Date,
    delay_minutes: Number,
    
    // For DRIVER_DELAY
    expected_delivery_time: Date,
    actual_delivery_time: Date,
    
    // Additional context
    additional_info: mongoose.Schema.Types.Mixed
  },
  // Detection info
  detected_at: {
    type: Date,
    default: Date.now
  },
  detected_by: {
    type: String,
    enum: ['SYSTEM', 'MANUAL'],
    default: 'SYSTEM'
  },
  // Manager review
  manager_notified: {
    type: Boolean,
    default: false
  },
  manager_notified_at: {
    type: Date,
    default: null
  },
  manager_reviewed: {
    type: Boolean,
    default: false
  },
  manager_reviewed_at: {
    type: Date,
    default: null
  },
  manager_reviewed_by: {
    type: String,
    ref: 'AppUser',
    default: null
  },
  // Violation confirmation
  is_confirmed_violation: {
    type: Boolean,
    default: false
  },
  manager_decision: {
    type: String,
    enum: ['CONFIRMED', 'DISMISSED', 'PENDING'],
    default: 'PENDING'
  },
  manager_notes: {
    type: String,
    default: ''
  },
  // Resolution
  resolution_required: {
    type: Boolean,
    default: false
  },
  resolution_notes: {
    type: String,
    default: ''
  },
  resolved_at: {
    type: Date,
    default: null
  },
  // Status
  status: {
    type: String,
    enum: ['OPEN', 'UNDER_REVIEW', 'CONFIRMED', 'DISMISSED', 'RESOLVED'],
    default: 'OPEN'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  _id: false,
  timestamps: false
});

// Index for performance queries
performanceViolationSchema.index({ user_id: 1, detected_at: -1 });
performanceViolationSchema.index({ violation_type: 1, status: 1 });
performanceViolationSchema.index({ manager_reviewed: 1, detected_at: -1 });

module.exports = mongoose.model('PerformanceViolation', performanceViolationSchema, 'performance_violation');