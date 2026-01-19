const mongoose = require('mongoose');

const recipeLineSchema = new mongoose.Schema({
  recipe_id: {
    type: String,
    required: true,
    ref: 'Recipe'
  },
  material_item_id: {
    type: String,
    required: true,
    ref: 'Item'
  },
  qty_per_batch: {
    type: Number,
    required: true
  },
  uom_id: {
    type: String,
    required: true,
    ref: 'UOM'
  },
  scrap_rate: {
    type: Number,
    default: 0
  }
}, {
  timestamps: false
});

module.exports = mongoose.model('RecipeLine', recipeLineSchema, 'recipe_line');
