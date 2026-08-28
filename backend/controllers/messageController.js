const prisma = require('../lib/prismaClient')
const { cloudinary } = require('../lib/cloudinary')
const { getIO } = require('../lib/socket')

// POST /api/messages/image  (multipart, field 'image')
// Upload-only — does NOT create a Message row. Client uploads here first,
// then sends the returned imageUrl/imagePublicId through socket
// 'message:send' (Phase C), same as every other message type.
const uploadChatImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image provided' })
  }

  res.status(201).json({
    imageUrl: req.file.path,
    imagePublicId: req.file.filename,
  })
}

// PATCH /api/messages/:id   { content }
const editMessage = async (req, res) => {
  const id = Number(req.params.id)
  const { content } = req.body

  if (!content || !content.trim()) {
    return res.status(400).json({ message: 'content is required' })
  }

  try {
    const message = await prisma.message.findUnique({ where: { id } })

    if (!message || message.deletedAt) {
      return res.status(404).json({ message: 'Message not found' })
    }
    if (message.senderId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' })
    }
    if (message.type !== 'TEXT') {
      return res.status(400).json({ message: 'Only text messages can be edited' })
    }

    const updated = await prisma.message.update({
      where: { id },
      data: { content: content.trim(), editedAt: new Date() },
    })

    getIO().to(`conversation:${message.conversationId}`).emit('message:edited', updated)

    res.json(updated)
  } catch (error) {
    console.error('editMessage error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// DELETE /api/messages/:id?scope=me|everyone
const deleteMessage = async (req, res) => {
  const id = Number(req.params.id)
  const scope = req.query.scope === 'everyone' ? 'everyone' : 'me'

  try {
    const message = await prisma.message.findUnique({ where: { id } })
    if (!message) {
      return res.status(404).json({ message: 'Message not found' })
    }

    if (scope === 'everyone') {
      if (message.senderId !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized' })
      }

      if (message.imagePublicId) {
        await cloudinary.uploader.destroy(message.imagePublicId)
      }

      const updated = await prisma.message.update({
        where: { id },
        data: { deletedAt: new Date(), content: null, imageUrl: null, imagePublicId: null },
      })

      getIO().to(`conversation:${message.conversationId}`).emit('message:deleted', { messageId: message.id, conversationId: message.conversationId })

      return res.json(updated)
    }

    // scope === 'me' — a filter row, not a real delete
    const membership = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: message.conversationId, userId: req.user.id } },
    })
    if (!membership) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    await prisma.messageDeletion.upsert({
      where: { messageId_userId: { messageId: id, userId: req.user.id } },
      update: {},
      create: { message: { connect: { id } }, user: { connect: { id: req.user.id } } },
    })

    res.json({ message: 'Deleted for you' })
  } catch (error) {
    console.error('deleteMessage error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

module.exports = { uploadChatImage, editMessage, deleteMessage }