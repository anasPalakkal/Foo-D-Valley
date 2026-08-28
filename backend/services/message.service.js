const prisma = require('../lib/prismaClient')

function buildPreview(type, content) {
  switch (type) {
    case 'IMAGE':
      return 'Photo'
    case 'RECIPE':
      return 'Shared a recipe'
    case 'SYSTEM':
      return content || 'System message'
    case 'TEXT':
    default:
      if (!content) return ''
      return content.length > 80 ? content.slice(0, 80) + '...' : content
  }
}

/**
 * Idempotent on (conversationId, senderId, clientId) — a retried send with
 * the same clientId (e.g. after a dropped ack) returns the existing row
 * instead of erroring or duplicating.
 */
async function createMessage({ conversationId, senderId, clientId, type = 'TEXT', content, imageUrl, imagePublicId, recipeId }) {
  try {
    return await prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          conversation: { connect: { id: conversationId } },
          sender: { connect: { id: senderId } },
          type,
          content: content || null,
          imageUrl: imageUrl || null,
          imagePublicId: imagePublicId || null,
          ...(recipeId && { recipe: { connect: { id: recipeId } } }),
          clientId: clientId || null,
        },
        include: {
          sender: { select: { id: true, name: true, avatarUrl: true } },
          recipe: { select: { id: true, title: true, imageUrl: true } },
        },
      })

      await tx.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: message.createdAt,
          lastMessagePreview: buildPreview(type, content),
          lastMessageSenderId: senderId,
        },
      })

      return { message, isRetry: false }
    })
  } catch (error) {
    if (error.code === 'P2002' && clientId) {
      const existing = await prisma.message.findUnique({
        where: { conversationId_senderId_clientId: { conversationId, senderId, clientId } },
        include: {
          sender: { select: { id: true, name: true, avatarUrl: true } },
          recipe: { select: { id: true, title: true, imageUrl: true } },
        },
      })
      if (existing) return { message: existing, isRetry: true }
    }
    throw error
  }
}

module.exports = { createMessage, buildPreview }