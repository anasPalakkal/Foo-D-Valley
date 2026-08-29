const { getIO } = require('../lib/socket')

// Must be called with a transaction client (tx), not the top-level prisma
// client — notification writes are always paired with the domain write
// (like/follow/comment) inside a single $transaction, so both succeed or
// both roll back together. No self-notifications.
async function createNotification(tx, { recipientId, actorId, type, entityType = null, entityId = null }) {
  if (recipientId === actorId) return null

  return tx.notification.create({
    data: { recipientId, actorId, type, entityType, entityId },
  })
}

// A notification mirrors the lifecycle of the row that caused it — unlike
// deletes the LIKE notification, unfollow deletes the FOLLOW notification.
// deleteMany is intentional: it's a no-op (not an error) if the notification
// was never created (self-action) or already consumed.
async function deleteNotification(tx, { recipientId, actorId, type, entityType = null, entityId = null }) {
  await tx.notification.deleteMany({
    where: { recipientId, actorId, type, entityType, entityId },
  })
}

// Call AFTER the transaction commits, never from inside it — a socket
// emit isn't transactional and shouldn't block or be rolled back by DB logic.
function emitNotification(notification) {
  if (!notification) return
  getIO().to(`user:${notification.recipientId}`).emit('notification:new', notification)
}

module.exports = { createNotification, deleteNotification, emitNotification }