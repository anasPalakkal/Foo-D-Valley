const express = require('express')
const router = express.Router()
const { getFavorites, addFavorite, removeFavorite } = require('../controllers/favoriteController')
const { protect } = require('../middleware/authMiddleware')

// all favorites routes are protected
router.use(protect)

router.get('/', getFavorites)
router.post('/', addFavorite)
router.delete('/:recipeId', removeFavorite)

module.exports = router