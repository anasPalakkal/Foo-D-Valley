const prisma = require('../lib/prismaClient')
const { createMessage, buildPreview } = require('../services/message.service')
const { isBlockedEitherDirection } = require('../services/block.service')
const { sendMessageSchema } = require('../validators/message.validators')

function registerMessageHandlers(io, socket, rateLimit) {
    socket.on('message:send', async (payload, ack) => {
        if (typeof ack !== 'function') return

        if (!rateLimit(socket.data.user.id, 'message:send')) {
            return ack({ error: 'Too many requests' })
        }

        if (!socket.data.user.isVerified) {
            return ack({ code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email to do this' })
        }

        const parsed = sendMessageSchema.safeParse(payload)
        if (!parsed.success) {
            return ack({ error: 'Invalid payload', details: parsed.error.flatten() })
        }

        const { conversationId, clientId, type, content, imageUrl, imagePublicId, recipeId } = parsed.data
        const senderId = socket.data.user.id

        // Membership check — same rule as REST, never trust client-supplied conversationId
        const membership = await prisma.conversationParticipant.findUnique({
            where: { conversationId_userId: { conversationId, userId: senderId } },
            include: { conversation: { select: { isGroup: true } } },
        })
        if (!membership) {
            return ack({ error: 'Conversation not found' })
        }

        // Block check — only meaningful for direct (non-group) conversations
        if (!membership.conversation?.isGroup) {
            const otherParticipant = await prisma.conversationParticipant.findFirst({
                where: { conversationId, userId: { not: senderId } },
                select: { userId: true },
            })
            if (otherParticipant) {
                const blocked = await isBlockedEitherDirection(senderId, otherParticipant.userId)
                if (blocked) {
                    return ack({ error: 'Cannot send message' })
                }
            }
        }

        let result
        try {
            result = await createMessage({ conversationId, senderId, clientId, type, content, imageUrl, imagePublicId, recipeId })
        } catch (error) {
            console.error('message:send failed', error)
            return ack({ error: 'Failed to send message' })
        }

        const { message, isRetry } = result

        ack({ success: true, message })

        if (!isRetry) {
            io.to(`conversation:${conversationId}`).emit('message:new', message)

            const participants = await prisma.conversationParticipant.findMany({
                where: { conversationId },
                select: { userId: true },
            })
            participants.forEach((p) => {
                io.to(`user:${p.userId}`).emit('conversation:updated', {
                    conversationId,
                    lastMessageAt: message.createdAt,
                    lastMessagePreview: buildPreview(type, content),
                    lastMessageSenderId: senderId,
                })
            })
        }
    })
}

module.exports = { registerMessageHandlers }