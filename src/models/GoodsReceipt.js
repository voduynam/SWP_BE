const mongoose = require('mongoose');

const goodsReceiptSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  receipt_no: {
    type: String,
    required: true,
    unique: true
  },
  shipment_id: {
    type: String,
    required: true,
    ref: 'Shipment'
  },
  received_date: {
    type: Date,
    required: true,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['DRAFT', 'RECEIVED', 'PARTIAL', 'CANCELLED'],
    default: 'DRAFT'
  },
  received_by: {
    type: String,
    required: true,
    ref: 'AppUser'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  _id: false,
  timestamps: false
});

module.exports = mongoose.model('GoodsReceipt', goodsReceiptSchema, 'goods_receipt');
