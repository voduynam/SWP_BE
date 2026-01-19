const mongoose = require('mongoose');

const inventoryBalanceSchema = new mongoose.Schema({
  location_id: {
    type: String,
    required: true,
    ref: 'Location'
  },
  item_id: {
    type: String,
    required: true,
    ref: 'Item'
  },
  lot_id: {
    type: String,
    ref: 'Lot',
    default: null
  },
  qty_on_hand: {
    type: Number,
    required: true,
    default: 0
  },
  qty_reserved: {
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

inventoryBalanceSchema.index({ location_id: 1, item_id: 1, lot_id: 1 }, { unique: true });

module.exports = mongoose.model('InventoryBalance', inventoryBalanceSchema, 'inventory_balance');
