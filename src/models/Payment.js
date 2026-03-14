const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  payment_no: {
    type: String,
    required: true,
    unique: true
  },
  order_id: {
    type: String,
    required: true,
    ref: 'InternalOrder'
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'VND'
  },
  payment_method: {
    type: String,
    enum: ['CASH', 'TRANSFER'],
    required: true
  },
  payment_status: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'],
    default: 'PENDING'
  },
  payment_type: {
    type: String,
    enum: ['CASH', 'BANK_TRANSFER'],
    required: true
  },
  
  // PayOS specific fields
  payos_transaction_id: {
    type: String,
    default: null
  },
  payos_request_id: {
    type: String,
    default: null
  },
  qr_code: {
    type: String,
    default: null
  },
  qr_code_base64: {
    type: String,
    default: null
  },
  
  // Transaction details
  bank_account_name: {
    type: String,
    default: null
  },
  bank_account_number: {
    type: String,
    default: null
  },
  bank_code: {
    type: String,
    default: null
  },
  description: {
    type: String,
    default: null
  },
  
  // Reference info
  reference_code: {
    type: String,
    default: null
  },
  order_code: {
    type: String,
    default: null
  },
  
  created_by: {
    type: String,
    required: true,
    ref: 'AppUser'
  },
  
  paid_at: {
    type: Date,
    default: null
  },
  
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
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

// Index để tìm kiếm nhanh (payment_no already has unique index via schema)
paymentSchema.index({ order_id: 1 });
paymentSchema.index({ payment_status: 1 });
paymentSchema.index({ payos_transaction_id: 1 });

module.exports = mongoose.model('Payment', paymentSchema, 'payment');
