const mongoose = require('mongoose');

const materialRequestSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  request_no: {
    type: String,
    required: true,
    unique: true
  },
  requested_by: {
    type: String,
    required: true,
    ref: 'AppUser'
  },
  request_date: {
    type: Date,
    required: true,
    default: Date.now
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    default: 'MEDIUM'
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'CANCELLED'],
    default: 'PENDING'
  },
  request_reason: {
    type: String,
    enum: ['PRODUCTION_SHORTAGE', 'PRODUCTION_SHORTAGE_COMPENSATION', 'EXPIRED_MATERIAL', 'QUALITY_ISSUE', 'STOCK_OUT', 'EMERGENCY', 'OTHER'],
    required: true
  },
  production_order_id: {
    type: String,
    ref: 'ProductionOrder'
  },
  location_id: {
    type: String,
    required: true,
    ref: 'Location'
  },
  notes: {
    type: String,
    default: ''
  },
  reviewed_by: {
    type: String,
    ref: 'AppUser'
  },
  reviewed_at: {
    type: Date
  },
  rejection_reason: {
    type: String,
    default: ''
  },
  expected_delivery: {
    type: Date
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

module.exports = mongoose.model('MaterialRequest', materialRequestSchema, 'material_request');