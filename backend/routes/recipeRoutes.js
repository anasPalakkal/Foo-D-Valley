const express = require('express')
const router = express.Router()
const {
  createRecipe,
  updateRecipe,
  getRecipes,
  getRecipeById,
  deleteRecipe,
} = require('../controllers/recipeController')
const { protect } = require('../middleware/authMiddleware')
const { upload, handleUploadError } = require('../lib/cloudinary')

router.get('/', getRecipes)
router.get('/:id', getRecipeById)
router.post('/', protect, upload.single('image'), handleUploadError, createRecipe)
router.put('/:id', protect, upload.single('image'), handleUploadError, updateRecipe)
router.delete('/:id', protect, deleteRecipe)

module.exports = router