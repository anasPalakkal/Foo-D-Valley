const express = require('express')
const router = express.Router()
const { protect } = require('../middleware/authMiddleware')
const { validate } = require('../middleware/validate')
const {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllRead,
} = require('../controllers/notificationController')
const { numericIdParamSchema } = require('../validators/notification.validators')

router.use(protect)

router.get('/', listNotifications)
router.get('/unread-count', getUnreadCount)
router.patch('/read-all', markAllRead)
router.patch('/:id/read', validate(numericIdParamSchema, 'params'), markNotificationRead)

module.exports = router