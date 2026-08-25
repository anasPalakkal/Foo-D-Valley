const express = require('express')
const router = express.Router()
const {
  getProfile,
  updateProfile,
  uploadAvatar,
  uploadBanner,
  removeAvatar,
  removeBanner,
  changePassword,
  deleteAccount,
} = require('../controllers/profileController')
const { protect, optionalProtect } = require('../middleware/authMiddleware')
const { avatarUpload, bannerUpload, handleUploadError } = require('../lib/cloudinary')
const { validate } = require('../middleware/validate')
const {
  updateProfileSchema,
  changePasswordSchema,
  deleteAccountSchema,
} = require('../validators/profile.validators')

router.get('/:userId', optionalProtect, getProfile)

router.put('/me', protect, validate(updateProfileSchema), updateProfile)
router.post('/me/avatar', protect, avatarUpload.single('avatar'), handleUploadError, uploadAvatar)
router.post('/me/banner', protect, bannerUpload.single('banner'), handleUploadError, uploadBanner)
router.delete('/me/avatar', protect, removeAvatar)
router.delete('/me/banner', protect, removeBanner)
router.put('/me/password', protect, validate(changePasswordSchema), changePassword)
router.delete('/me', protect, validate(deleteAccountSchema), deleteAccount)

module.exports = router