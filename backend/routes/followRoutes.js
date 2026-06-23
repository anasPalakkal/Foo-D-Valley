const express = require('express')
const router = express.Router()
const { followUser, unfollowUser, getFollowers, getFollowing } = require('../controllers/followController')
const { protect } = require('../middleware/authMiddleware')

router.post('/:userId/follow', protect, followUser)
router.delete('/:userId/follow', protect, unfollowUser)
router.get('/:userId/followers', getFollowers)
router.get('/:userId/following', getFollowing)

module.exports = router