const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  parent_id: {
    type: String,
    ref: 'Category',
    default: null
  }
}, {
  _id: false,
  timestamps: false
});

module.exports = mongoose.model('Category', categorySchema, 'category');
