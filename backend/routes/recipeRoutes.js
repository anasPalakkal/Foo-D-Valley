const express = require('express')
const router = express.Router()
const {
  createRecipe,
  updateRecipe,
  getRecipes,
  getRecipeById,
  deleteRecipe,
  getPopularRecipes,
  getFeed,
  getRecommendations
} = require('../controllers/recipeController')

const { getLikeStatus, likeRecipe, unlikeRecipe, getBatchLikeCounts } = require('../controllers/likeController')
const { getComments, createComment } = require('../controllers/commentController')
const { protect, optionalProtect, requireVerified } = require('../middleware/authMiddleware')
const { recipeUpload, handleUploadError } = require('../lib/cloudinary')
const { validate } = require('../middleware/validate')
const { moderateRateLimit, writeRateLimit } = require('../middleware/rateLimiters')
const {
  createRecipeSchema,
  updateRecipeSchema,
  createCommentSchema,
  batchLikesSchema,
  numericIdParamSchema,
  validateRecipeIdParam,
  validateRecipeBody,
} = require('../validators/recipe.validators')

router.get('/', optionalProtect, getRecipes)
router.get('/popular', getPopularRecipes)
router.get('/feed', optionalProtect, getFeed)

// Read-only, requires a logged-in user for their like/favorite history but
// nothing to validate (no body, no :id param) - just protect.
router.get('/recommendations', protect, getRecommendations)

// Static routes above must stay before '/:id' — Express matches in
// declaration order, and '/:id' would otherwise swallow these.
router.get('/:id', validate(numericIdParamSchema, 'params'), optionalProtect, getRecipeById)

router.post(
  '/',
  protect,
  requireVerified,
  writeRateLimit,
  recipeUpload.single('image'),
  handleUploadError,
  validateRecipeBody(createRecipeSchema),
  createRecipe
)
router.put(
  '/:id',
  protect,
  writeRateLimit,
  validate(numericIdParamSchema, 'params'),
  recipeUpload.single('image'),
  handleUploadError,
  validateRecipeBody(updateRecipeSchema),
  updateRecipe
)
router.delete('/:id', protect, validate(numericIdParamSchema, 'params'), deleteRecipe)

router.get('/:id/likes', validateRecipeIdParam, optionalProtect, getLikeStatus)
router.post('/:id/like', protect, moderateRateLimit, validateRecipeIdParam, likeRecipe)
router.delete('/:id/like', protect, validateRecipeIdParam, unlikeRecipe)
router.get('/:id/comments', validateRecipeIdParam, getComments)
router.post(
  '/:id/comments',
  protect,
  requireVerified,
  moderateRateLimit,
  validateRecipeIdParam,
  validate(createCommentSchema),
  createComment
)
router.post('/likes/batch', validate(batchLikesSchema), getBatchLikeCounts)

module.exports = router