const mongoose = require('mongoose');

const productionOrderSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  prod_order_no: {
    type: String,
    required: true,
    unique: true
  },
  internal_order_id: {
    type: String,
    default: null,
    ref: 'InternalOrder'
  },
  compensating_for_order_id: {
    type: String,
    default: null,
    ref: 'ProductionOrder'
  },
  is_compensating_order: {
    type: Boolean,
    default: false
  },
  estimated_material_cost: {
    type: Number,
    default: 0
  },
  actual_material_cost: {
    type: Number,
    default: 0
  },
  cost_variance: {
    type: Number,
    default: 0
  },
  planned_start: {
    type: Date,
    required: true
  },
  planned_end: {
    type: Date,
    required: true
  },
  actual_start: {
    type: Date
  },
  actual_end: {
    type: Date
  },
  status: {
    type: String,
    enum: ['DRAFT', 'PLANNED', 'RELEASED', 'IN_PROGRESS', 'DONE', 'CANCELLED'],
    default: 'DRAFT'
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

module.exports = mongoose.model('ProductionOrder', productionOrderSchema, 'production_order');
