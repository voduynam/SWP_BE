const mongoose = require('mongoose');

const internalOrderLineSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  order_id: {
    type: String,
    required: true,
    ref: 'InternalOrder'
  },
  item_id: {
    type: String,
    required: true,
    ref: 'Item'
  },
  qty_ordered: {
    type: Number,
    required: true
  },
  uom_id: {
    type: String,
    required: true,
    ref: 'UOM'
  },
  unit_price: {
    type: Number,
    required: true
  },
  line_total: {
    type: Number,
    required: true
  }
}, {
  _id: false,
  timestamps: false
});

module.exports = mongoose.model('InternalOrderLine', internalOrderLineSchema, 'internal_order_line');
