const mongoose = require('mongoose');

const internalOrderSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  order_no: {
    type: String,
    required: true,
    unique: true
  },
  store_org_unit_id: {
    type: String,
    required: true,
    ref: 'OrgUnit'
  },
  order_date: {
    type: Date,
    required: true,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'PROCESSING', 'SHIPPED', 'RECEIVED', 'CANCELLED'],
    default: 'DRAFT'
  },
  created_by: {
    type: String,
    required: true,
    ref: 'AppUser'
  },
  total_amount: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'VND'
  },
  is_urgent: {
    type: Boolean,
    default: false
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

module.exports = mongoose.model('InternalOrder', internalOrderSchema, 'internal_order');
