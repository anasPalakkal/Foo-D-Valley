const express = require('express')
const router = express.Router()
const { protect } = require('../middleware/authMiddleware')
const { validate } = require('../middleware/validate')
const { listConversations, createConversation, getConversationById, getMessages, markRead, toggleMute } = require('../controllers/conversationController')
const { createConversationSchema, markReadSchema, toggleMuteSchema, numericIdParamSchema } = require('../validators/conversation.validators')

router.use(protect) // no guest access to messaging, unlike optionalProtect routes elsewhere

router.get('/', listConversations)
router.post('/', validate(createConversationSchema), createConversation)
router.get('/:id', validate(numericIdParamSchema, 'params'), getConversationById)
router.get('/:id/messages', validate(numericIdParamSchema, 'params'), getMessages)
router.patch('/:id/read', validate(numericIdParamSchema, 'params'), validate(markReadSchema), markRead)
router.patch('/:id/mute', validate(numericIdParamSchema, 'params'), validate(toggleMuteSchema), toggleMute)

module.exports = router