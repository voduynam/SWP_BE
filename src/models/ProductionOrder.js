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
