const mongoose = require('mongoose');

const orderFulfillmentSchema = new mongoose.Schema({
  fulfillment_id: {
    type: Number,
    required: true,
    unique: true
  },
  order_line_id: {
    type: String,
    required: true,
    ref: 'InternalOrderLine'
  },
  qty_shipped_total: {
    type: Number,
    default: 0
  },
  qty_received_total: {
    type: Number,
    default: 0
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false
});

module.exports = mongoose.model('OrderFulfillment', orderFulfillmentSchema, 'order_fulfillment');
