const asyncHandler = require('../utils/asyncHandler');
const Item = require('../models/Item');
const ApiResponse = require('../utils/ApiResponse');

// @desc    Get all items
// @route   GET /api/items
// @access  Private
exports.getItems = asyncHandler(async (req, res) => {
  const { item_type, status, category_id, search } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = {};
  if (item_type) filter.item_type = item_type;
  if (status) filter.status = status;
  if (category_id) filter.category_id = category_id;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } }
    ];
  }

  const items = await Item.find(filter)
    .populate('base_uom_id', 'code name')
    .populate('category_id', 'name')
    .skip(skip)
    .limit(limit)
    .sort({ created_at: -1 });

  const total = await Item.countDocuments(filter);

  return res.status(200).json(
    ApiResponse.paginate(items, page, limit, total)
  );
});

// @desc    Get single item
// @route   GET /api/items/:id
// @access  Private
exports.getItem = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id)
    .populate('base_uom_id', 'code name')
    .populate('category_id', 'name');

  if (!item) {
    return res.status(404).json(
      ApiResponse.error('Item not found', 404)
    );
  }

  return res.status(200).json(
    ApiResponse.success(item)
  );
});

// @desc    Create item
// @route   POST /api/items
// @access  Private (Manager, Admin)
exports.createItem = asyncHandler(async (req, res) => {
  const {
    _id,
    sku,
    name,
    item_type,
    base_uom_id,
    category_id,
    tracking_type,
    shelf_life_days,
    cost_price,
    base_sell_price
  } = req.body;

  // Check if SKU already exists
  const existingItem = await Item.findOne({ sku });
  if (existingItem) {
    return res.status(400).json(
      ApiResponse.error('SKU already exists', 400)
    );
  }

  const item = await Item.create({
    _id: _id || `item_${Date.now()}`,
    sku,
    name,
    item_type,
    base_uom_id,
    category_id,
    tracking_type: tracking_type || 'NONE',
    shelf_life_days: shelf_life_days || 0,
    cost_price: cost_price || 0,
    base_sell_price: base_sell_price || 0,
    status: 'ACTIVE'
  });

  const populatedItem = await Item.findById(item._id)
    .populate('base_uom_id', 'code name')
    .populate('category_id', 'name');

  return res.status(201).json(
    ApiResponse.success(populatedItem, 'Item created successfully', 201)
  );
});

// @desc    Update item
// @route   PUT /api/items/:id
// @access  Private (Manager, Admin)
exports.updateItem = asyncHandler(async (req, res) => {
  let item = await Item.findById(req.params.id);
  if (!item) {
    return res.status(404).json(
      ApiResponse.error('Item not found', 404)
    );
  }

  // Check if SKU is being changed and if it already exists
  if (req.body.sku && req.body.sku !== item.sku) {
    const existingItem = await Item.findOne({ sku: req.body.sku });
    if (existingItem) {
      return res.status(400).json(
        ApiResponse.error('SKU already exists', 400)
      );
    }
  }

  item = await Item.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('base_uom_id', 'code name')
   .populate('category_id', 'name');

  return res.status(200).json(
    ApiResponse.success(item, 'Item updated successfully')
  );
});

// @desc    Delete item
// @route   DELETE /api/items/:id
// @access  Private (Admin)
exports.deleteItem = asyncHandler(async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item) {
    return res.status(404).json(
      ApiResponse.error('Item not found', 404)
    );
  }

  // Soft delete by setting status to INACTIVE
  item.status = 'INACTIVE';
  await item.save();

  return res.status(200).json(
    ApiResponse.success(null, 'Item deactivated successfully')
  );
});

// @desc    Update material cost prices (Manager only)
// @route   PUT /api/items/:id/cost-price
// @access  Private (Manager, Admin)
exports.updateMaterialCostPrice = asyncHandler(async (req, res) => {
  const { cost_price } = req.body;

  if (cost_price === undefined || cost_price === null) {
    return res.status(400).json(
      ApiResponse.error('Cost price is required', 400)
    );
  }

  if (cost_price < 0) {
    return res.status(400).json(
      ApiResponse.error('Cost price cannot be negative', 400)
    );
  }

  const item = await Item.findById(req.params.id);
  if (!item) {
    return res.status(404).json(
      ApiResponse.error('Item not found', 404)
    );
  }

  // Only allow updating cost price for raw materials
  if (item.item_type !== 'RAW') {
    return res.status(400).json(
      ApiResponse.error('Cost price can only be updated for raw materials', 400)
    );
  }

  const oldCostPrice = item.cost_price || 0;
  item.cost_price = cost_price;
  item.updated_at = new Date();
  await item.save();

  // Cascade: recalculate cost_price for all finished products using this material
  try {
    const RecipeLine = require('../models/RecipeLine');
    const Recipe = require('../models/Recipe');
    const { recalcFinishedItemCost } = require('./recipe.controller');

    // Find all recipe lines that use this material
    const affectedRecipeLines = await RecipeLine.find({ material_item_id: item._id });
    const affectedRecipeIds = [...new Set(affectedRecipeLines.map(rl => rl.recipe_id))];

    // Recalculate cost for each affected recipe's finished item
    for (const recipeId of affectedRecipeIds) {
      await recalcFinishedItemCost(recipeId);
    }

    if (affectedRecipeIds.length > 0) {
      console.log(`[Cost Cascade] Updated ${affectedRecipeIds.length} finished product(s) after material cost change for ${item.name}`);
    }
  } catch (error) {
    console.error('Error cascading cost price update to finished products:', error);
  }

  // Create audit log for cost price changes
  try {
    const { createNotificationInternal } = require('./notification.controller');
    await createNotificationInternal({
      recipient_role: 'ADMIN',
      title: 'Material Cost Price Updated',
      message: `${req.user.full_name || req.user.username} updated cost price for ${item.name} from ${oldCostPrice.toLocaleString()} to ${cost_price.toLocaleString()} VND`,
      type: 'INFO',
      ref_type: 'ITEM',
      ref_id: item._id
    });
  } catch (error) {
    console.error('Error creating cost price update notification:', error);
  }

  const populatedItem = await Item.findById(item._id)
    .populate('base_uom_id', 'code name')
    .populate('category_id', 'name');

  return res.status(200).json(
    ApiResponse.success({
      item: populatedItem,
      cost_change: {
        old_cost_price: oldCostPrice,
        new_cost_price: cost_price,
        change_amount: cost_price - oldCostPrice,
        change_percentage: oldCostPrice > 0 ? ((cost_price - oldCostPrice) / oldCostPrice * 100).toFixed(2) : 'N/A',
        updated_by: req.user.full_name || req.user.username,
        updated_at: new Date()
      }
    }, 'Material cost price updated successfully')
  );
});

// @desc    Batch update material cost prices
// @route   PUT /api/items/batch-update-cost-prices
// @access  Private (Manager, Admin)
exports.batchUpdateMaterialCostPrices = asyncHandler(async (req, res) => {
  const { updates } = req.body;

  if (!updates || !Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json(
      ApiResponse.error('Updates array is required', 400)
    );
  }

  const results = [];
  const errors = [];

  for (const update of updates) {
    try {
      const { item_id, cost_price } = update;

      if (!item_id || cost_price === undefined || cost_price === null) {
        errors.push({
          item_id: item_id || 'unknown',
          error: 'Item ID and cost price are required'
        });
        continue;
      }

      if (cost_price < 0) {
        errors.push({
          item_id,
          error: 'Cost price cannot be negative'
        });
        continue;
      }

      const item = await Item.findById(item_id);
      if (!item) {
        errors.push({
          item_id,
          error: 'Item not found'
        });
        continue;
      }

      if (item.item_type !== 'RAW') {
        errors.push({
          item_id,
          error: 'Cost price can only be updated for raw materials'
        });
        continue;
      }

      const oldCostPrice = item.cost_price || 0;
      item.cost_price = cost_price;
      item.updated_at = new Date();
      await item.save();

      results.push({
        item_id,
        item_name: item.name,
        old_cost_price: oldCostPrice,
        new_cost_price: cost_price,
        change_amount: cost_price - oldCostPrice,
        success: true
      });

    } catch (error) {
      errors.push({
        item_id: update.item_id || 'unknown',
        error: error.message
      });
    }
  }

  // Cascade: recalculate cost_price for all finished products using any updated materials
  try {
    const RecipeLine = require('../models/RecipeLine');
    const { recalcFinishedItemCost } = require('./recipe.controller');

    const updatedItemIds = results.map(r => r.item_id);
    const affectedRecipeLines = await RecipeLine.find({ material_item_id: { $in: updatedItemIds } });
    const affectedRecipeIds = [...new Set(affectedRecipeLines.map(rl => rl.recipe_id))];

    for (const recipeId of affectedRecipeIds) {
      await recalcFinishedItemCost(recipeId);
    }

    if (affectedRecipeIds.length > 0) {
      console.log(`[Cost Cascade] Batch update: recalculated ${affectedRecipeIds.length} finished product(s)`);
    }
  } catch (error) {
    console.error('Error cascading batch cost price update:', error);
  }

  // Create summary notification
  try {
    const { createNotificationInternal } = require('./notification.controller');
    await createNotificationInternal({
      recipient_role: 'ADMIN',
      title: 'Batch Material Cost Price Update',
      message: `${req.user.full_name || req.user.username} updated cost prices for ${results.length} materials. ${errors.length} errors occurred.`,
      type: errors.length > 0 ? 'WARNING' : 'SUCCESS',
      ref_type: 'BATCH_UPDATE',
      ref_id: `batch_${Date.now()}`
    });
  } catch (error) {
    console.error('Error creating batch update notification:', error);
  }

  return res.status(200).json(
    ApiResponse.success({
      successful_updates: results,
      errors: errors,
      summary: {
        total_requested: updates.length,
        successful: results.length,
        failed: errors.length,
        total_cost_change: results.reduce((sum, r) => sum + r.change_amount, 0)
      }
    }, `Batch update completed: ${results.length} successful, ${errors.length} failed`)
  );
});

// @desc    Get materials without cost prices
// @route   GET /api/items/materials-without-cost
// @access  Private (Manager, Admin)
exports.getMaterialsWithoutCost = asyncHandler(async (req, res) => {
  const materialsWithoutCost = await Item.find({
    item_type: 'RAW',
    $or: [
      { cost_price: { $exists: false } },
      { cost_price: null },
      { cost_price: 0 }
    ],
    status: 'ACTIVE'
  })
  .populate('base_uom_id', 'code name')
  .populate('category_id', 'name')
  .sort({ name: 1 });

  return res.status(200).json(
    ApiResponse.success({
      materials: materialsWithoutCost,
      count: materialsWithoutCost.length,
      suggested_prices: materialsWithoutCost.map(material => ({
        item_id: material._id,
        name: material.name,
        sku: material.sku,
        suggested_cost_price: getSuggestedCostPrice(material.name),
        current_cost_price: material.cost_price || 0
      }))
    }, `Found ${materialsWithoutCost.length} materials without cost prices`)
  );
});

// Helper function to suggest cost prices based on material name
const getSuggestedCostPrice = (materialName) => {
  const suggestions = {
    'dầu': 45000,
    'oil': 45000,
    'đường': 25000,
    'sugar': 25000,
    'bột': 20000,
    'flour': 20000,
    'nước': 35000,
    'water': 35000,
    'chuối': 30000,
    'banana': 30000,
    'khoai': 18000,
    'potato': 18000,
    'đậu': 28000,
    'bean': 28000,
    'thịt': 150000,
    'meat': 150000,
    'beef': 150000,
    'cà chua': 22000,
    'tomato': 22000
  };

  const name = materialName.toLowerCase();
  for (const [keyword, price] of Object.entries(suggestions)) {
    if (name.includes(keyword)) {
      return price;
    }
  }
  return 25000; // Default suggestion
};

// @desc    Recalculate cost_price for all finished products from their active recipes
// @route   POST /api/items/recalc-finished-costs
// @access  Private (Manager, Admin)
exports.recalcAllFinishedProductCosts = asyncHandler(async (req, res) => {
  const Recipe = require('../models/Recipe');
  const RecipeLine = require('../models/RecipeLine');

  // Find all active recipes
  const activeRecipes = await Recipe.find({ status: 'ACTIVE' });

  const results = [];

  for (const recipe of activeRecipes) {
    const recipeLines = await RecipeLine.find({ recipe_id: recipe._id })
      .populate('material_item_id', 'cost_price name');

    const totalCost = recipeLines.reduce((sum, line) => {
      const materialCost = line.material_item_id?.cost_price || 0;
      const qty = line.qty_per_batch || 0;
      return sum + (materialCost * qty);
    }, 0);

    const item = await Item.findById(recipe.item_id);
    if (item) {
      const oldCostPrice = item.cost_price || 0;
      item.cost_price = totalCost;
      item.updated_at = new Date();
      await item.save();

      results.push({
        item_id: item._id,
        item_name: item.name,
        recipe_id: recipe._id,
        old_cost_price: oldCostPrice,
        new_cost_price: totalCost,
        materials: recipeLines.map(rl => ({
          name: rl.material_item_id?.name,
          cost_price: rl.material_item_id?.cost_price || 0,
          qty_per_batch: rl.qty_per_batch,
          line_cost: (rl.material_item_id?.cost_price || 0) * (rl.qty_per_batch || 0)
        }))
      });
    }
  }

  return res.status(200).json(
    ApiResponse.success({
      recalculated_count: results.length,
      results
    }, `Recalculated cost_price for ${results.length} finished products`)
  );
});
