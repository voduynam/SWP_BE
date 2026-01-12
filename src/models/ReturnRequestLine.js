const mongoose = require('mongoose');

const returnRequestLineSchema = new mongoose.Schema({
  return_request_id: {
    type: String,
    required: true,
    ref: 'ReturnRequest'
  },
  source_receipt_line_id: {
    type: String,
    ref: 'GoodsReceiptLine'
  },
  item_id: {
    type: String,
    required: true,
    ref: 'Item'
  },
  lot_id: {
    type: String,
    ref: 'Lot'
  },
  qty_requested: {
    type: Number,
    required: true
  },
  disposition: {
    type: String,
    enum: ['RESTOCK', 'DESTROY', 'RETURN_TO_SUPPLIER'],
    default: 'RESTOCK'
  },
  reason: {
    type: String
  }
}, {
  timestamps: false
});

module.exports = mongoose.model('ReturnRequestLine', returnRequestLineSchema, 'return_request_line');
