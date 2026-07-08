const express = require('express')
const router = express.Router()
const {
  createRecipe,
  updateRecipe,
  getRecipes,
  getRecipeById,
  deleteRecipe,
} = require('../controllers/recipeController')
const { getLikeStatus, likeRecipe, unlikeRecipe, getBatchLikeCounts } = require('../controllers/likeController')
const { getComments, createComment } = require('../controllers/commentController')
const { protect, optionalProtect } = require('../middleware/authMiddleware')
const { upload, handleUploadError } = require('../lib/cloudinary')

router.get('/', optionalProtect, getRecipes)
router.get('/:id', optionalProtect, getRecipeById)
router.post('/', protect, upload.single('image'), handleUploadError, createRecipe)
router.put('/:id', protect, upload.single('image'), handleUploadError, updateRecipe)
router.delete('/:id', protect, deleteRecipe)

router.get('/:id/likes', optionalProtect, getLikeStatus)
router.post('/:id/like', protect, likeRecipe)
router.delete('/:id/like', protect, unlikeRecipe)
router.get('/:id/comments', getComments)
router.post('/:id/comments', protect, createComment)
router.post('/likes/batch', getBatchLikeCounts)

module.exports = router