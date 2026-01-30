const express = require('express');
const router = express.Router();
const recipeController = require('../controllers/recipe.controller');
const { protect, authorize } = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: 2. Master Data
 *   description: Production recipe management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Recipe:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         item_id:
 *           type: string
 *         version:
 *           type: string
 *         status:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *         effective_from:
 *           type: string
 *           format: date
 *     RecipeLine:
 *       type: object
 *       properties:
 *         material_item_id:
 *           type: string
 *         qty_per_batch:
 *           type: number
 *         uom_id:
 *           type: string
 */

// All routes require authentication
router.use(protect);

/**
 * @swagger
 * /api/recipes:
 *   get:
 *     summary: Get all recipes
 *     tags: [2. Master Data]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: item_id
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of recipes
 */
router.get('/', recipeController.getRecipes);

/**
 * @swagger
 * /api/recipes/{id}:
 *   get:
 *     summary: Get single recipe with lines
 *     tags: [2. Master Data]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Recipe details
 */
router.get('/:id', recipeController.getRecipe);

/**
 * @swagger
 * /api/recipes:
 *   post:
 *     summary: Create recipe
 *     tags: [2. Master Data]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               item_id:
 *                 type: string
 *               version:
 *                 type: string
 *               lines:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/RecipeLine'
 *     responses:
 *       201:
 *         description: Recipe created
 */
router.post('/', authorize('MANAGER', 'ADMIN'), recipeController.createRecipe);

/**
 * @swagger
 * /api/recipes/{id}:
 *   put:
 *     summary: Update recipe
 *     tags: [2. Master Data]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Recipe'
 *     responses:
 *       200:
 *         description: Recipe updated
 */
router.put('/:id', authorize('MANAGER', 'ADMIN'), recipeController.updateRecipe);

/**
 * @swagger
 * /api/recipes/{id}/status:
 *   put:
 *     summary: Toggle recipe status
 *     tags: [2. Master Data]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Status toggled
 */
router.put('/:id/status', authorize('MANAGER', 'ADMIN'), recipeController.toggleRecipeStatus);

/**
 * @swagger
 * /api/recipes/{id}/lines:
 *   post:
 *     summary: Add line to recipe
 *     tags: [2. Master Data]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           $ref: '#/components/schemas/RecipeLine'
 *     responses:
 *       201:
 *         description: Line added
 */
router.post('/:id/lines', authorize('MANAGER', 'ADMIN'), recipeController.addRecipeLine);

/**
 * @swagger
 * /api/recipes/{id}/lines/{lineId}:
 *   delete:
 *     summary: Delete recipe line
 *     tags: [2. Master Data]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: lineId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Line deleted
 */
router.delete('/:id/lines/:lineId', authorize('MANAGER', 'ADMIN'), recipeController.deleteRecipeLine);

module.exports = router;
