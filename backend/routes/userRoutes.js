const express = require('express')
const router = express.Router()
const { protect } = require('../middleware/authMiddleware')
const { validate } = require('../middleware/validate')
const { searchUsers, blockUser, unblockUser } = require('../controllers/userController')
const { numericIdParamSchema } = require('../validators/user.validators')

router.use(protect)

// Mounted BEFORE followRoutes in server.js — see note there. Must stay first.
router.get('/search', searchUsers)
router.post('/:id/block', validate(numericIdParamSchema, 'params'), blockUser)
router.delete('/:id/block', validate(numericIdParamSchema, 'params'), unblockUser)

module.exports = router