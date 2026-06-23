const express = require('express')
const router = express.Router()
const multer = require('multer')
const { getProfile, updateProfile, uploadAvatar } = require('../controllers/profileController')
const { protect, optionalProtect } = require('../middleware/authMiddleware')

const upload = multer({ dest: 'uploads/' })

// Public with optional auth — guests see basic profile, logged-in users also get isFollowing
router.get('/:userId', optionalProtect, getProfile)

// Protected
router.put('/me', protect, updateProfile)
router.post('/me/avatar', protect, upload.single('avatar'), uploadAvatar)

module.exports = router