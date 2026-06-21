const express = require('express')
const router = express.Router()
const { createRecipe, getRecipes, getRecipeById, deleteRecipe } = require('../controllers/recipeController')
const { protect } = require('../middleware/authMiddleware')
const { upload } = require('../lib/cloudinary')

router.get('/', getRecipes)
router.get('/:id', getRecipeById)
router.post('/', protect, upload.single('image'), createRecipe)
router.delete('/:id', protect, deleteRecipe)

module.exports = router