const express = require('express')
const router = express.Router()
const { getFavorites, addFavorite, removeFavorite } = require('../controllers/favoriteController')
const { protect } = require('../middleware/authMiddleware')
const { validate } = require('../middleware/validate')
const { moderateRateLimit } = require('../middleware/rateLimiters')
const { addFavoriteSchema, validateFavoriteIdParam } = require('../validators/favorite.validators')

// all favorites routes are protected
router.use(protect)

router.get('/', getFavorites)
router.post('/', moderateRateLimit, validate(addFavoriteSchema), addFavorite)
router.delete('/:recipeId', moderateRateLimit, validateFavoriteIdParam, removeFavorite)

module.exports = router