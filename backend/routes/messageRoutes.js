const express = require('express')
const router = express.Router()
const { protect } = require('../middleware/authMiddleware')
const { validate } = require('../middleware/validate')
const { writeRateLimit } = require('../middleware/rateLimiters')
const { chatUpload, handleUploadError } = require('../lib/cloudinary')
const { uploadChatImage, editMessage, deleteMessage } = require('../controllers/messageController')
const { editMessageSchema, numericIdParamSchema } = require('../validators/message.validators')

router.use(protect)

router.post('/image', writeRateLimit, chatUpload.single('image'), handleUploadError, uploadChatImage)
router.patch('/:id', validate(numericIdParamSchema, 'params'), validate(editMessageSchema), editMessage)
router.delete('/:id', validate(numericIdParamSchema, 'params'), deleteMessage)

module.exports = router