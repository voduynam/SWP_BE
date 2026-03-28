const mongoose = require('mongoose');

const lotSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  item_id: {
    type: String,
    required: true,
    ref: 'Item'
  },
  lot_code: {
    type: String,
    required: true
  },
  mfg_date: {
    type: Date,
    required: true
  },
  exp_date: {
    type: Date
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'NEAR_EXPIRY', 'EXPIRED', 'DISPOSED', 'CONSUMED'],
    default: 'ACTIVE'
  },
  disposal_status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'DISPOSED'],
    default: null
  },
  disposed_date: {
    type: Date
  },
  disposed_by: {
    type: String,
    ref: 'AppUser'
  },
  disposal_reason: {
    type: String,
    default: ''
  },
  disposal_notes: {
    type: String,
    default: ''
  },
  disposal_method: {
    type: String,
    enum: ['TRASH', 'COMPOST', 'RETURN_SUPPLIER', 'RECYCLE', 'OTHER'],
    default: null
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

module.exports = mongoose.model('Lot', lotSchema, 'lot');
