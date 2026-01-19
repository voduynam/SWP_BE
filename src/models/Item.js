const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  sku: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  item_type: {
    type: String,
    required: true,
    enum: ['RAW', 'FINISHED']
  },
  base_uom_id: {
    type: String,
    required: true,
    ref: 'UOM'
  },
  category_id: {
    type: String,
    ref: 'Category'
  },
  tracking_type: {
    type: String,
    enum: ['NONE', 'LOT', 'LOT_EXPIRY', 'SERIAL'],
    default: 'NONE'
  },
  shelf_life_days: {
    type: Number,
    default: 0
  },
  cost_price: {
    type: Number,
    default: 0
  },
  base_sell_price: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'ACTIVE'
  }
}, {
  _id: false,
  timestamps: false
});

module.exports = mongoose.model('Item', itemSchema, 'item');
