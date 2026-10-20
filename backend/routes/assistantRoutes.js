const express = require('express')
const router = express.Router()
const { chat, saveRecipe, getAiRecipe } = require('../controllers/assistantController')
const { warmUp } = require('../services/elaai.service')
const { protect, requireVerified } = require('../middleware/authMiddleware')
const { validate } = require('../middleware/validate')
const { moderateRateLimit } = require('../middleware/rateLimiters')
const { chatSchema, recipeSchema, idParamSchema } = require('../validators/assistant.validators')

router.use(protect, requireVerified)

// Widget calls this when it opens, so ElaAI is awake by the time the user submits.
router.post('/warm', moderateRateLimit, (req, res) => {
  warmUp()
  res.status(204).end()
})

router.post('/chat', moderateRateLimit, validate(chatSchema), chat)
router.post('/save-recipe', moderateRateLimit, validate(recipeSchema), saveRecipe)
router.get('/recipes/:id', validate(idParamSchema, 'params'), getAiRecipe)

module.exports = router