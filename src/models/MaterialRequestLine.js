const mongoose = require('mongoose');

const materialRequestLineSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  material_request_id: {
    type: String,
    required: true,
    ref: 'MaterialRequest'
  },
  item_id: {
    type: String,
    required: true,
    ref: 'Item'
  },
  quantity_requested: {
    type: Number,
    required: true
  },
  quantity_approved: {
    type: Number,
    default: 0
  },
  uom_id: {
    type: String,
    required: true,
    ref: 'UOM'
  },
  current_stock: {
    type: Number,
    default: 0
  },
  minimum_required: {
    type: Number,
    required: true
  },
  urgency_level: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL'],
    default: 'MEDIUM'
  },
  reason: {
    type: String,
    required: true
  },
  estimated_cost: {
    type: Number,
    default: 0
  },
  supplier_preference: {
    type: String,
    ref: 'Supplier'
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  _id: false,
  timestamps: false
});

module.exports = mongoose.model('MaterialRequestLine', materialRequestLineSchema, 'material_request_line');