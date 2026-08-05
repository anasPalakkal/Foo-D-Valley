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

router.get('/:userId', optionalProtect, getProfile)

router.put('/me', protect, updateProfile)
router.post('/me/avatar', protect, avatarUpload.single('avatar'), handleUploadError, uploadAvatar)
router.post('/me/banner', protect, bannerUpload.single('banner'), handleUploadError, uploadBanner)
router.delete('/me/avatar', protect, removeAvatar)
router.delete('/me/banner', protect, removeBanner)
router.put('/me/password', protect, changePassword)
router.delete('/me', protect, deleteAccount)

module.exports = router