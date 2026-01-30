// ============================================================================
// RETURN REQUEST LINE MODEL - CURRENTLY DISABLED
// ============================================================================
// This model defines the return request line schema
// Currently commented out as it's not needed for the current project phase
// ============================================================================

/*
const mongoose = require('mongoose');

const returnRequestLineSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  return_request_id: {
    type: String,
    required: true,
    ref: 'ReturnRequest'
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
  qty_return: {
    type: Number,
    required: true
  },
  uom_id: {
    type: String,
    required: true,
    ref: 'UOM'
  },
  reason: {
    type: String,
    default: ''
  },
  defect_type: {
    type: String,
    enum: ['DAMAGED', 'EXPIRED', 'WRONG_ITEM', 'QUALITY_ISSUE', 'OTHER'],
    default: 'OTHER'
  },
  disposition: {
    type: String,
    enum: ['RESTOCK', 'DESTROY', 'RETURN_TO_SUPPLIER'],
    default: 'RESTOCK'
  }
}, {
  _id: false,
  timestamps: false
});

module.exports = mongoose.model('ReturnRequestLine', returnRequestLineSchema, 'return_request_line');
*/
