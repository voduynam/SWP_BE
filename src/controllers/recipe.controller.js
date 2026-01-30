const asyncHandler = require('../utils/asyncHandler');
const Recipe = require('../models/Recipe');
const RecipeLine = require('../models/RecipeLine');
const ApiResponse = require('../utils/ApiResponse');

// @desc    Get all recipes
// @route   GET /api/recipes
// @access  Private
exports.getRecipes = asyncHandler(async (req, res) => {
  const { item_id, status } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = {};
  if (item_id) filter.item_id = item_id;
  if (status) filter.status = status;

  const recipes = await Recipe.find(filter)
    .populate('item_id', 'sku name item_type')
    .skip(skip)
    .limit(limit)
    .sort({ effective_from: -1 });

  const total = await Recipe.countDocuments(filter);

  return res.status(200).json(
    ApiResponse.paginate(recipes, page, limit, total)
  );
});

// @desc    Get single recipe with lines
// @route   GET /api/recipes/:id
// @access  Private
exports.getRecipe = asyncHandler(async (req, res) => {
  const recipe = await Recipe.findById(req.params.id)
    .populate('item_id', 'sku name item_type');

  if (!recipe) {
    return res.status(404).json(
      ApiResponse.error('Recipe not found', 404)
    );
  }

  const recipeLines = await RecipeLine.find({ recipe_id: recipe._id })
    .populate('material_item_id', 'sku name item_type')
    .populate('uom_id', 'code name');

  return res.status(200).json(
    ApiResponse.success({
      ...recipe.toObject(),
      lines: recipeLines
    })
  );
});

// @desc    Create recipe
// @route   POST /api/recipes
// @access  Private (Manager, Admin)
exports.createRecipe = asyncHandler(async (req, res) => {
  const { _id, item_id, version, status, effective_from, effective_to, lines } = req.body;

  if (!lines || lines.length === 0) {
    return res.status(400).json(
      ApiResponse.error('Recipe must have at least one line', 400)
    );
  }

  // Check if version already exists for this item
  const existingRecipe = await Recipe.findOne({ item_id, version });
  if (existingRecipe) {
    return res.status(400).json(
      ApiResponse.error('Recipe version already exists for this item', 400)
    );
  }

  const recipeStatus = status || 'ACTIVE';

  // If new recipe is ACTIVE, set all other recipes for this item to INACTIVE
  if (recipeStatus === 'ACTIVE') {
    await Recipe.updateMany(
      { item_id, status: 'ACTIVE' },
      { status: 'INACTIVE', updated_at: new Date() }
    );
  }

  // Create recipe
  const recipe = await Recipe.create({
    _id: _id || `recipe_${Date.now()}`,
    item_id,
    version,
    status: recipeStatus,
    effective_from: effective_from || new Date(),
    effective_to: effective_to || null
  });

  // Create recipe lines
  const recipeLines = await Promise.all(
    lines.map(async (line) => {
      return await RecipeLine.create({
        recipe_id: recipe._id,
        material_item_id: line.material_item_id,
        qty_per_batch: line.qty_per_batch,
        uom_id: line.uom_id,
        scrap_rate: line.scrap_rate || 0
      });
    })
  );

  const populatedRecipe = await Recipe.findById(recipe._id)
    .populate('item_id', 'sku name item_type');

  return res.status(201).json(
    ApiResponse.success({
      ...populatedRecipe.toObject(),
      lines: recipeLines
    }, 'Recipe created successfully', 201)
  );
});

// @desc    Update recipe
// @route   PUT /api/recipes/:id
// @access  Private (Manager, Admin)
exports.updateRecipe = asyncHandler(async (req, res) => {
  const recipe = await Recipe.findById(req.params.id);
  if (!recipe) {
    return res.status(404).json(
      ApiResponse.error('Recipe not found', 404)
    );
  }

  // If status is being changed to ACTIVE, deactivate others first
  if (req.body.status === 'ACTIVE' && recipe.status !== 'ACTIVE') {
    await Recipe.updateMany(
      { item_id: recipe.item_id, status: 'ACTIVE' },
      { status: 'INACTIVE', updated_at: new Date() }
    );
  }

  // Update recipe
  const updatedRecipe = await Recipe.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('item_id', 'sku name item_type');

  return res.status(200).json(
    ApiResponse.success(updatedRecipe, 'Recipe updated successfully')
  );
});

// @desc    Toggle recipe status
// @route   PUT /api/recipes/:id/status
// @access  Private (Manager, Admin)
exports.toggleRecipeStatus = asyncHandler(async (req, res) => {
  const recipe = await Recipe.findById(req.params.id);
  if (!recipe) {
    return res.status(404).json(
      ApiResponse.error('Recipe not found', 404)
    );
  }

  const newStatus = recipe.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

  // If activating, deactivate all other recipes for this item
  if (newStatus === 'ACTIVE') {
    await Recipe.updateMany(
      { item_id: recipe.item_id, status: 'ACTIVE' },
      { status: 'INACTIVE', updated_at: new Date() }
    );
  }

  recipe.status = newStatus;
  recipe.updated_at = new Date();
  await recipe.save();

  return res.status(200).json(
    ApiResponse.success(recipe, `Recipe status updated to ${newStatus}`)
  );
});

// @desc    Add line to recipe
// @route   POST /api/recipes/:id/lines
// @access  Private (Manager, Admin)
exports.addRecipeLine = asyncHandler(async (req, res) => {
  const recipe = await Recipe.findById(req.params.id);
  if (!recipe) {
    return res.status(404).json(
      ApiResponse.error('Recipe not found', 404)
    );
  }

  const { material_item_id, qty_per_batch, uom_id, scrap_rate } = req.body;

  const recipeLine = await RecipeLine.create({
    recipe_id: recipe._id,
    material_item_id,
    qty_per_batch,
    uom_id,
    scrap_rate: scrap_rate || 0
  });

  const populatedLine = await RecipeLine.findById(recipeLine._id)
    .populate('material_item_id', 'sku name item_type')
    .populate('uom_id', 'code name');

  return res.status(201).json(
    ApiResponse.success(populatedLine, 'Recipe line added successfully', 201)
  );
});

// @desc    Delete recipe line
// @route   DELETE /api/recipes/:id/lines/:lineId
// @access  Private (Manager, Admin)
exports.deleteRecipeLine = asyncHandler(async (req, res) => {
  const recipeLine = await RecipeLine.findOne({
    _id: req.params.lineId,
    recipe_id: req.params.id
  });

  if (!recipeLine) {
    return res.status(404).json(
      ApiResponse.error('Recipe line not found', 404)
    );
  }

  await RecipeLine.findByIdAndDelete(req.params.lineId);

  return res.status(200).json(
    ApiResponse.success(null, 'Recipe line deleted successfully')
  );
});
