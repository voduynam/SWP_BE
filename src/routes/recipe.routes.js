const express = require('express');
const router = express.Router();
const recipeController = require('../controllers/recipe.controller');
const { protect, authorize } = require('../middlewares/auth');

// All routes require authentication
router.use(protect);

// @route   GET /api/recipes
// @desc    Get all recipes
// @access  Private
router.get('/', recipeController.getRecipes);

// @route   GET /api/recipes/:id
// @desc    Get single recipe with lines
// @access  Private
router.get('/:id', recipeController.getRecipe);

// @route   POST /api/recipes
// @desc    Create recipe
// @access  Private (Manager, Admin)
router.post('/', authorize('MANAGER', 'ADMIN'), recipeController.createRecipe);

// @route   PUT /api/recipes/:id
// @desc    Update recipe
// @access  Private (Manager, Admin)
router.put('/:id', authorize('MANAGER', 'ADMIN'), recipeController.updateRecipe);

// @route   POST /api/recipes/:id/lines
// @desc    Add line to recipe
// @access  Private (Manager, Admin)
router.post('/:id/lines', authorize('MANAGER', 'ADMIN'), recipeController.addRecipeLine);

// @route   DELETE /api/recipes/:id/lines/:lineId
// @desc    Delete recipe line
// @access  Private (Manager, Admin)
router.delete('/:id/lines/:lineId', authorize('MANAGER', 'ADMIN'), recipeController.deleteRecipeLine);

module.exports = router;
