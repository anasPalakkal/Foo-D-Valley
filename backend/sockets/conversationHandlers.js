const prisma = require('../lib/prismaClient')

function registerConversationHandlers(io, socket, rateLimit) {
    socket.on('conversation:join', async (payload, ack) => {
        if (typeof ack !== 'function') return // no silent-fail path for malformed clients

        if (!rateLimit(socket.data.user.id, 'conversation:join')) {
            return ack({ error: 'Too many requests' })
        }

        if (!socket.data.user.isVerified) {
            return ack({ code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email to do this' })
        }

        const conversationId = Number(payload?.conversationId)
        if (!Number.isInteger(conversationId) || conversationId <= 0) {
            return ack({ error: 'Invalid conversationId' })
        }

        const membership = await prisma.conversationParticipant.findUnique({
            where: { conversationId_userId: { conversationId, userId: socket.data.user.id } },
        })

        if (!membership) {
            return ack({ error: 'Conversation not found' })
        }

        socket.join(`conversation:${conversationId}`)
        ack({ success: true, conversationId })
    })

    socket.on('conversation:leave', (payload, ack) => {
        const conversationId = Number(payload?.conversationId)
        if (Number.isInteger(conversationId) && conversationId > 0) {
            socket.leave(`conversation:${conversationId}`)
        }
        if (typeof ack === 'function') ack({ success: true })
    })
}

module.exports = { registerConversationHandlers }