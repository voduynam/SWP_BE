const mongoose = require('mongoose');

const inventoryTransactionSchema = new mongoose.Schema({
  txn_time: {
    type: Date,
    required: true,
    default: Date.now
  },
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
  qty: {
    type: Number,
    required: true
  },
  uom_id: {
    type: String,
    required: true,
    ref: 'UOM'
  },
  txn_type: {
    type: String,
    required: true,
    enum: ['RECEIPT', 'ISSUE', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT', 'PRODUCTION_IN', 'PRODUCTION_OUT', 'CONSUMPTION']
  },
  ref_type: {
    type: String,
    enum: ['PURCHASE_ORDER', 'SHIPMENT', 'GOODS_RECEIPT', 'PRODUCTION_ORDER', 'RETURN_REQUEST', 'ADJUSTMENT', 'OTHER']
  },
  ref_id: {
    type: String
  },
  created_by: {
    type: String,
    ref: 'AppUser'
  },
  notes: {
    type: String
  }
}, {
  timestamps: false
});

inventoryTransactionSchema.index({ location_id: 1, item_id: 1, lot_id: 1, txn_time: -1 });

module.exports = mongoose.model('InventoryTransaction', inventoryTransactionSchema, 'inventory_transaction');
