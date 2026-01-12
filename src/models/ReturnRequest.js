const mongoose = require('mongoose');

const returnRequestSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  store_org_unit_id: {
    type: String,
    required: true,
    ref: 'OrgUnit'
  },
  source_receipt_id: {
    type: String,
    ref: 'GoodsReceipt'
  },
  request_date: {
    type: Date,
    required: true,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['REQUESTED', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'CANCELLED'],
    default: 'REQUESTED'
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
