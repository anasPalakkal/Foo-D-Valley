const prisma = require('../lib/prismaClient')

// GET /api/notifications?before=<id>&limit=20
const listNotifications = async (req, res) => {
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20))
  const before = req.query.before ? Number(req.query.before) : undefined

  try {
    const notifications = await prisma.notification.findMany({
      where: { recipientId: req.user.id },
      orderBy: { id: 'desc' },
      take: limit + 1,
      ...(before && { cursor: { id: before }, skip: 1 }),
      include: {
        actor: { select: { id: true, name: true, avatarUrl: true } },
      },
    })

    const hasMore = notifications.length > limit
    const page = hasMore ? notifications.slice(0, limit) : notifications

    res.json({ notifications: page, hasMore })
  } catch (error) {
    console.error('listNotifications error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// GET /api/notifications/unread-count
const getUnreadCount = async (req, res) => {
  try {
    const count = await prisma.notification.count({
      where: { recipientId: req.user.id, isRead: false },
    })
    res.json({ count })
  } catch (error) {
    console.error('getUnreadCount error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// PATCH /api/notifications/:id/read
const markNotificationRead = async (req, res) => {
  const id = Number(req.params.id)

  try {
    const result = await prisma.notification.updateMany({
      where: { id, recipientId: req.user.id },
      data: { isRead: true },
    })

    if (result.count === 0) {
      return res.status(404).json({ message: 'Notification not found' })
    }

    res.json({ message: 'Marked as read' })
  } catch (error) {
    console.error('markNotificationRead error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// PATCH /api/notifications/read-all
const markAllRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { recipientId: req.user.id, isRead: false },
      data: { isRead: true },
    })
    res.json({ message: 'All marked as read' })
  } catch (error) {
    console.error('markAllRead error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

module.exports = { listNotifications, getUnreadCount, markNotificationRead, markAllRead }