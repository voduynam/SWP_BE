const mongoose = require('mongoose');

const productionOrderLineSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  prod_order_id: {
    type: String,
    required: true,
    ref: 'ProductionOrder'
  },
  item_id: {
    type: String,
    required: true,
    ref: 'Item'
  },
  recipe_id: {
    type: String,
    ref: 'Recipe'
  },
  planned_qty: {
    type: Number,
    required: true
  },
  actual_qty: {
    type: Number,
    default: 0
  },
  uom_id: {
    type: String,
    required: true,
    ref: 'UOM'
  }
}, {
  _id: false,
  timestamps: false
});

module.exports = mongoose.model('ProductionOrderLine', productionOrderLineSchema, 'production_order_line');
