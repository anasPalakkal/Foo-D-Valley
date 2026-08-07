const express = require('express')
const router = express.Router()
const { followUser, unfollowUser, getFollowers, getFollowing } = require('../controllers/followController')
const { validate } = require('../middleware/validate')
const { moderateRateLimit } = require('../middleware/rateLimiters')
const { userIdParamSchema } = require('../validators/follow.validators')

const { protect, optionalProtect, requireVerified } = require('../middleware/authMiddleware')

router.post(
  '/:userId/follow',
  protect,
  requireVerified,
  moderateRateLimit,
  validate(userIdParamSchema, 'params'),
  followUser
)
router.delete(
  '/:userId/follow',
  protect,
  moderateRateLimit,
  validate(userIdParamSchema, 'params'),
  unfollowUser
)
// optionalProtect — viewer's own follow-state is needed to render Follow/Follow Back/Following per row
router.get('/:userId/followers', optionalProtect, validate(userIdParamSchema, 'params'), getFollowers)
router.get('/:userId/following', optionalProtect, validate(userIdParamSchema, 'params'), getFollowing)

module.exports = router