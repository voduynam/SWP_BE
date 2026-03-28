const mongoose = require('mongoose');

const returnRequestSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  return_no: {
    type: String,
    required: true,
    unique: true
  },
  store_org_unit_id: {
    type: String,
    required: true,
    ref: 'OrgUnit'
  },
  goods_receipt_id: {
    type: String,
    ref: 'GoodsReceipt'
  },
  return_date: {
    type: Date,
    required: true,
    default: Date.now
  },
  reason: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'CANCELLED'],
    default: 'PENDING'
  },
  resolution_notes: {
    type: String,
    default: ''
  },
  // Ảnh chứng minh hàng hư
  evidence_photos: [{
    photo_url: {
      type: String,
      required: true
    },
    uploaded_at: {
      type: Date,
      default: Date.now
    },
    description: {
      type: String,
      default: ''
    }
  }],
  // Manager approval
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
  // Replacement order tracking
  replacement_order_id: {
    type: String,
    ref: 'InternalOrder'
  },
  replacement_cost: {
    type: Number,
    default: 0
  },
  is_replacement_completed: {
    type: Boolean,
    default: false
  },
  created_by: {
    type: String,
    required: true,
    ref: 'AppUser'
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

module.exports = mongoose.model('ReturnRequest', returnRequestSchema, 'return_request');
