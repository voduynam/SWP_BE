const mongoose = require('mongoose');

const wasteTransactionSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  transaction_date: {
    type: Date,
    required: true,
    default: Date.now
  },
  waste_type: {
    type: String,
    enum: ['EXPIRED_MATERIAL', 'RETURN_REPLACEMENT', 'PRODUCTION_WASTE', 'DISPOSAL'],
    required: true
  },
  reference_type: {
    type: String,
    enum: ['LOT', 'RETURN_REQUEST', 'PRODUCTION_ORDER', 'MANUAL_DISPOSAL'],
    required: true
  },
  reference_id: {
    type: String,
    required: true
  },
  item_id: {
    type: String,
    required: true,
    ref: 'Item'
  },
  lot_id: {
    type: String,
    ref: 'Lot'
  },
  quantity_wasted: {
    type: Number,
    required: true
  },
  uom_id: {
    type: String,
    required: true,
    ref: 'UOM'
  },
  unit_cost: {
    type: Number,
    required: true,
    default: 0
  },
  total_waste_value: {
    type: Number,
    required: true,
    default: 0
  },
  location_id: {
    type: String,
    required: true,
    ref: 'Location'
  },
  reason: {
    type: String,
    required: true
  },
  notes: {
    type: String,
    default: ''
  },
  disposal_method: {
    type: String,
    enum: ['TRASH', 'COMPOST', 'RETURN_SUPPLIER', 'RECYCLE', 'OTHER'],
    default: 'TRASH'
  },
  created_by: {
    type: String,
    required: true,
    ref: 'AppUser'
  },
  approved_by: {
    type: String,
    ref: 'AppUser'
  },
  approved_at: {
    type: Date
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  _id: false,
  timestamps: false
});

module.exports = mongoose.model('WasteTransaction', wasteTransactionSchema, 'waste_transaction');