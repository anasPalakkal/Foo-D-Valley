const express = require('express')
const router = express.Router()
const { getAllExternalMeals, getExternalMeta, invalidateCache } = require('../controllers/externalController')
const { protect } = require('../middleware/authMiddleware')

// Public — read-only, no auth needed
router.get('/meals', getAllExternalMeals)
router.get('/meta', getExternalMeta)

// Protected — cache invalidation should not be a public endpoint
router.post('/meals/invalidate', protect, invalidateCache)

module.exports = router