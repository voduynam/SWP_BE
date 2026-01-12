const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  item_id: {
    type: String,
    required: true,
    ref: 'Item'
  },
  version: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'ACTIVE'
  },
  effective_from: {
    type: Date,
    default: Date.now
  },
  effective_to: {
    type: Date,
    default: null
  }
}, {
  _id: false,
  timestamps: false
});

module.exports = mongoose.model('Recipe', recipeSchema, 'recipe');
