const mongoose = require('mongoose');

const itemUOMConversionSchema = new mongoose.Schema({
  item_id: {
    type: String,
    required: true,
    ref: 'Item'
  },
  uom_id: {
    type: String,
    required: true,
    ref: 'UOM'
  },
  base_qty: {
    type: Number,
    required: true
  },
  is_default_purchase: {
    type: Boolean,
    default: false
  },
  is_default_sell: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: false
});

itemUOMConversionSchema.index({ item_id: 1, uom_id: 1 }, { unique: true });

module.exports = mongoose.model('ItemUOMConversion', itemUOMConversionSchema, 'item_uom_conversion');
