const express = require('express')
const router = express.Router()
const {
  getProfile,
  updateProfile,
  uploadAvatar,
  uploadBanner,
} = require('../controllers/profileController')
const { protect, optionalProtect } = require('../middleware/authMiddleware')
const { upload } = require('../lib/cloudinary')

// Public with optional auth
router.get('/:userId', optionalProtect, getProfile)

// Protected
router.put('/me', protect, updateProfile)
router.post('/me/avatar', protect, upload.single('avatar'), uploadAvatar)
router.post('/me/banner', protect, upload.single('banner'), uploadBanner)

module.exports = router