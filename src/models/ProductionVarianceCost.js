const mongoose = require('mongoose');

const productionVarianceCostSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  original_production_order_id: {
    type: String,
    required: true,
    ref: 'ProductionOrder'
  },
  compensating_production_order_id: {
    type: String,
    required: true,
    ref: 'ProductionOrder'
  },
  variance_type: {
    type: String,
    enum: ['SHORTAGE', 'EXCESS', 'WASTE'],
    default: 'SHORTAGE'
  },
  planned_quantity: {
    type: Number,
    required: true
  },
  actual_quantity: {
    type: Number,
    required: true
  },
  shortage_quantity: {
    type: Number,
    required: true
  },
  material_costs: [{
    material_item_id: {
      type: String,
      ref: 'Item'
    },
    material_name: String,
    quantity_used: Number,
    unit_cost: Number,
    total_cost: Number,
    uom_id: {
      type: String,
      ref: 'UOM'
    }
  }],
  total_variance_cost: {
    type: Number,
    required: true,
    default: 0
  },
  currency: {
    type: String,
    default: 'VND'
  },
  cost_center: {
    type: String,
    default: 'CENTRAL_KITCHEN_PRODUCTION'
  },
  impact_on_profit: {
    type: Number,
    required: true,
    default: 0
  },
  reason: {
    type: String,
    required: true
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
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  notes: String,
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

module.exports = mongoose.model('ProductionVarianceCost', productionVarianceCostSchema, 'production_variance_cost');