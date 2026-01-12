const mongoose = require('mongoose');

const shipmentLineSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  shipment_id: {
    type: String,
    required: true,
    ref: 'Shipment'
  },
  item_id: {
    type: String,
    required: true,
    ref: 'Item'
  },
  qty: {
    type: Number,
    required: true
  },
  uom_id: {
    type: String,
    required: true,
    ref: 'UOM'
  },
  order_line_id: {
    type: String,
    ref: 'InternalOrderLine'
  }
}, {
  _id: false,
  timestamps: false
});

module.exports = mongoose.model('ShipmentLine', shipmentLineSchema, 'shipment_line');
