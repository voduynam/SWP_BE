const mongoose = require('mongoose');

const shipmentLineLotSchema = new mongoose.Schema({
  shipment_line_id: {
    type: String,
    required: true,
    ref: 'ShipmentLine'
  },
  lot_id: {
    type: String,
    required: true,
    ref: 'Lot'
  },
  qty: {
    type: Number,
    required: true
  }
}, {
  timestamps: false
});

module.exports = mongoose.model('ShipmentLineLot', shipmentLineLotSchema, 'shipment_line_lot');
