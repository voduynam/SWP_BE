const mongoose = require('mongoose');

const goodsReceiptLineSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  receipt_id: {
    type: String,
    required: true,
    ref: 'GoodsReceipt'
  },
  shipment_line_id: {
    type: String,
    required: true,
    ref: 'ShipmentLine'
  },
  item_id: {
    type: String,
    required: true,
    ref: 'Item'
  },
  qty_received: {
    type: Number,
    required: true,
    default: 0
  },
  qty_rejected: {
    type: Number,
    default: 0
  }
}, {
  _id: false,
  timestamps: false
});

module.exports = mongoose.model('GoodsReceiptLine', goodsReceiptLineSchema, 'goods_receipt_line');
