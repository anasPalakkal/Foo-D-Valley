const prisma = require('../lib/prismaClient')

function buildDirectKey(userIdA, userIdB) {
  const [a, b] = [userIdA, userIdB].sort((x, y) => x - y)
  return `${a}_${b}`
}

async function isBlockedEitherDirection(userIdA, userIdB) {
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: userIdA, blockedId: userIdB },
        { blockerId: userIdB, blockedId: userIdA },
      ],
    },
  })
  return !!block
}

// GET /api/conversations?before=<id>&limit=20
const listConversations = async (req, res) => {
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20))
  const before = req.query.before ? Number(req.query.before) : undefined

  try {
    const memberships = await prisma.conversationParticipant.findMany({
      where: { userId: req.user.id },
      select: { conversationId: true, lastReadMessageId: true },
    })

    const conversationIds = memberships.map((m) => m.conversationId)
    if (conversationIds.length === 0) {
      return res.json({ conversations: [], hasMore: false })
    }
    const lastReadByConversation = new Map(memberships.map((m) => [m.conversationId, m.lastReadMessageId]))

    const conversations = await prisma.conversation.findMany({
      where: { id: { in: conversationIds } },
      orderBy: [
        { lastMessageAt: { sort: 'desc', nulls: 'last' } },
        { id: 'desc' },
      ],
      take: limit + 1,
      ...(before && { cursor: { id: before }, skip: 1 }),
      include: {
        participants: {
          where: { userId: { not: req.user.id } },
          include: { user: { select: { id: true, name: true, avatarUrl: true, isDeleted: true } } },
        },
      },
    })

    const hasMore = conversations.length > limit
    const page = hasMore ? conversations.slice(0, limit) : conversations

    const result = await Promise.all(
      page.map(async (c) => {
        const lastRead = lastReadByConversation.get(c.id) || 0
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: c.id,
            id: { gt: lastRead },
            senderId: { not: req.user.id },
            deletedAt: null,
          },
        })
        // 1:1 only — isGroup is always false today, so the only entry left
        // after excluding req.user.id above is the other participant.
        return {
          id: c.id,
          isGroup: c.isGroup,
          title: c.title,
          lastMessageAt: c.lastMessageAt,
          lastMessagePreview: c.lastMessagePreview,
          lastMessageSenderId: c.lastMessageSenderId,
          unreadCount,
          otherParticipant: c.participants[0]?.user || null,
        }
      })
    )

    res.json({ conversations: result, hasMore })
  } catch (error) {
    console.error('listConversations error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// POST /api/conversations   { recipientUserId }
const createConversation = async (req, res) => {
  const recipientUserId = Number(req.body.recipientUserId)

  if (!recipientUserId || recipientUserId === req.user.id) {
    return res.status(400).json({ message: 'A valid recipientUserId is required' })
  }

  try {
    const recipient = await prisma.user.findUnique({ where: { id: recipientUserId } })
    if (!recipient || recipient.isDeleted) {
      return res.status(404).json({ message: 'User not found' })
    }

    if (await isBlockedEitherDirection(req.user.id, recipientUserId)) {
      return res.status(403).json({ message: 'Cannot start a conversation with this user' })
    }

    const directKey = buildDirectKey(req.user.id, recipientUserId)

    try {
      const conversation = await prisma.$transaction(async (tx) => {
        const created = await tx.conversation.create({ data: { directKey } })
        await tx.conversationParticipant.createMany({
          data: [
            { conversationId: created.id, userId: req.user.id },
            { conversationId: created.id, userId: recipientUserId },
          ],
        })
        return created
      })

      return res.status(201).json(conversation)
    } catch (error) {
      // Race: two simultaneous requests both pass the block/existence check
      // above and both attempt the same directKey. The unique constraint is
      // the real guarantee — on violation, return the row that won instead
      // of a 500.
      if (error.code === 'P2002') {
        const existing = await prisma.conversation.findUnique({ where: { directKey } })
        if (existing) return res.status(200).json(existing)
      }
      throw error
    }
  } catch (error) {
    console.error('createConversation error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// GET /api/conversations/:id
const getConversationById = async (req, res) => {
  const id = Number(req.params.id)

  try {
    const membership = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: id, userId: req.user.id } },
    })
    if (!membership) {
      return res.status(404).json({ message: 'Conversation not found' })
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        participants: { include: { user: { select: { id: true, name: true, avatarUrl: true, isDeleted: true } } } },
      },
    })

    res.json(conversation)
  } catch (error) {
    console.error('getConversationById error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// GET /api/conversations/:id/messages?before=<id>&limit=30
const getMessages = async (req, res) => {
  const conversationId = Number(req.params.id)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 30))
  const before = req.query.before ? Number(req.query.before) : undefined

  try {
    const membership = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: req.user.id } },
    })
    if (!membership) {
      return res.status(404).json({ message: 'Conversation not found' })
    }

    // Exclude messages this user deleted "for me" — everyone else still sees them.
    const myDeletions = await prisma.messageDeletion.findMany({
      where: { userId: req.user.id, message: { conversationId } },
      select: { messageId: true },
    })
    const excludedIds = myDeletions.map((d) => d.messageId)

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        ...(excludedIds.length && { id: { notIn: excludedIds } }),
        ...(before && { id: { lt: before } }),
      },
      orderBy: { id: 'desc' },
      take: limit,
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
        recipe: { select: { id: true, title: true, imageUrl: true } },
      },
    })

    res.json({ messages: messages.reverse(), hasMore: messages.length === limit })
  } catch (error) {
    console.error('getMessages error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// PATCH /api/conversations/:id/read   { messageId }
const markRead = async (req, res) => {
  const conversationId = Number(req.params.id)
  const messageId = Number(req.body.messageId)

  if (!messageId) {
    return res.status(400).json({ message: 'messageId is required' })
  }

  try {
    // GREATEST at the DB level, not check-then-set in JS — guards against
    // two devices/tabs racing to mark read out of order (Section 7 of the plan).
    const affected = await prisma.$executeRaw`
      UPDATE "ConversationParticipant"
      SET "lastReadMessageId" = GREATEST(COALESCE("lastReadMessageId", 0), ${messageId})
      WHERE "conversationId" = ${conversationId} AND "userId" = ${req.user.id}
    `

    if (affected === 0) {
      return res.status(404).json({ message: 'Conversation not found' })
    }

    // Phase C wires: getIO().to(`conversation:${conversationId}`).emit('message:read', {...})

    res.json({ message: 'Marked as read' })
  } catch (error) {
    console.error('markRead error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// PATCH /api/conversations/:id/mute   { isMuted }
const toggleMute = async (req, res) => {
  const conversationId = Number(req.params.id)
  const { isMuted } = req.body

  try {
    const updated = await prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId: req.user.id } },
      data: { isMuted: !!isMuted },
    })

    res.json(updated)
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Conversation not found' })
    }
    console.error('toggleMute error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

module.exports = { listConversations, createConversation, getConversationById, getMessages, markRead, toggleMute }