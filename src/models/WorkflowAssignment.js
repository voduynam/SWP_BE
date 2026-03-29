const mongoose = require('mongoose');

const workflowAssignmentSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  task_type: {
    type: String,
    enum: [
      'SHIPMENT_COORDINATION',  // Coordinator phải assign driver cho shipment
      'DELIVERY_EXECUTION',     // Driver phải giao hàng
      'PRODUCTION_EXECUTION'    // Chef phải hoàn thành production
    ],
    required: true
  },
  reference_type: {
    type: String,
    enum: ['SHIPMENT', 'PRODUCTION_ORDER', 'DELIVERY_ROUTE'],
    required: true
  },
  reference_id: {
    type: String,
    required: true
  },
  // Assignment info
  assigned_to: {
    type: String,
    required: true,
    ref: 'AppUser'
  },
  assigned_role: {
    type: String,
    enum: ['CHEF', 'SUPPLY_COORDINATOR', 'DRIVER'],
    required: true
  },
  assigned_at: {
    type: Date,
    default: Date.now
  },
  assigned_by: {
    type: String,
    enum: ['SYSTEM', 'MANAGER'],
    default: 'SYSTEM'
  },
  // Timeline expectations
  expected_start: {
    type: Date,
    required: true
  },
  expected_completion: {
    type: Date,
    required: true
  },
  // Actual execution
  actual_start: {
    type: Date,
    default: null
  },
  actual_completion: {
    type: Date,
    default: null
  },
  // Status tracking
  status: {
    type: String,
    enum: ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED'],
    default: 'ASSIGNED'
  },
  // Performance tracking
  is_overdue: {
    type: Boolean,
    default: false
  },
  delay_minutes: {
    type: Number,
    default: 0
  },
  // Notes
  assignment_notes: {
    type: String,
    default: ''
  },
  completion_notes: {
    type: String,
    default: ''
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
workflowAssignmentSchema.index({ assigned_to: 1, status: 1 });
workflowAssignmentSchema.index({ task_type: 1, expected_completion: 1 });
workflowAssignmentSchema.index({ is_overdue: 1, status: 1 });

module.exports = mongoose.model('WorkflowAssignment', workflowAssignmentSchema, 'workflow_assignment');