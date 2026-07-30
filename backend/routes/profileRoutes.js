const express = require('express')
const router = express.Router()
const {
  getProfile,
  updateProfile,
  uploadAvatar,
  uploadBanner,
  changePassword,
  deleteAccount,
} = require('../controllers/profileController')
const { protect, optionalProtect } = require('../middleware/authMiddleware')
const { avatarUpload, bannerUpload, handleUploadError } = require('../lib/cloudinary')
const { validate } = require('../middleware/validate')
const { strictRateLimit, moderateRateLimit, writeRateLimit } = require('../middleware/rateLimiters')
const { userIdParamSchema } = require('../validators/follow.validators')
const { updateProfileSchema, changePasswordSchema, deleteAccountSchema } = require('../validators/profile.validators')

// Public with optional auth
router.get('/:userId', validate(userIdParamSchema, 'params'), optionalProtect, getProfile)

// Protected
router.put('/me', protect, moderateRateLimit, validate(updateProfileSchema), updateProfile)
router.post('/me/avatar', protect, writeRateLimit, avatarUpload.single('avatar'), handleUploadError, uploadAvatar)
router.post('/me/banner', protect, writeRateLimit, bannerUpload.single('banner'), handleUploadError, uploadBanner)
router.put('/me/password', protect, strictRateLimit, validate(changePasswordSchema), changePassword)
router.delete('/me', protect, strictRateLimit, validate(deleteAccountSchema), deleteAccount)

module.exports = router