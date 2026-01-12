const mongoose = require('mongoose');

const uomSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true
  }
}, {
  _id: false,
  timestamps: false
});

module.exports = mongoose.model('UOM', uomSchema, 'uom');
