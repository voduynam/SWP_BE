const mongoose = require('mongoose');

const lotSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  item_id: {
    type: String,
    required: true,
    ref: 'Item'
  },
  lot_code: {
    type: String,
    required: true
  },
  mfg_date: {
    type: Date,
    required: true
  },
  exp_date: {
    type: Date
  }
}, {
  _id: false,
  timestamps: false
});

module.exports = mongoose.model('Lot', lotSchema, 'lot');
