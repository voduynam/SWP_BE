const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  tax_code: {
    type: String
  },
  address: {
    type: String
  }
}, {
  _id: false,
  timestamps: false
});

module.exports = mongoose.model('Supplier', supplierSchema, 'supplier');
