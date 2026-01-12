const mongoose = require('mongoose');

const productionOutputLotSchema = new mongoose.Schema({
  prod_order_line_id: {
    type: String,
    required: true,
    ref: 'ProductionOrderLine'
  },
  lot_id: {
    type: String,
    required: true,
    ref: 'Lot'
  },
  qty: {
    type: Number,
    required: true
  },
  uom_id: {
    type: String,
    required: true,
    ref: 'UOM'
  }
}, {
  timestamps: false
});

module.exports = mongoose.model('ProductionOutputLot', productionOutputLotSchema, 'production_output_lot');
