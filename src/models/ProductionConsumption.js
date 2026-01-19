const mongoose = require('mongoose');

const productionConsumptionSchema = new mongoose.Schema({
  prod_order_line_id: {
    type: String,
    required: true,
    ref: 'ProductionOrderLine'
  },
  material_item_id: {
    type: String,
    required: true,
    ref: 'Item'
  },
  lot_id: {
    type: String,
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

module.exports = mongoose.model('ProductionConsumption', productionConsumptionSchema, 'production_consumption');
