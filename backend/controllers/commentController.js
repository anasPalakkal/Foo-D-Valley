const prisma = require('../lib/prismaClient')
const { createNotification, emitNotification, deleteNotification } = require('../services/notification.service')
// GET /api/recipes/:id/comments?type=external
const getComments = async (req, res) => {
  const { id } = req.params
  const isExternal = req.query.type === 'external'

  try {
    const where = isExternal
      ? { externalId: id, user: { isDeleted: false } }
      : { recipeId: parseInt(id), user: { isDeleted: false } }

    const comments = await prisma.recipeComment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    })

    res.json(comments)
  } catch (error) {
    console.error('Get comments error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// POST /api/recipes/:id/comments?type=external
const createComment = async (req, res) => {
  const { id } = req.params
  const { content } = req.body
  const isExternal = req.query.type === 'external'

  if (!content || !content.trim()) {
    return res.status(400).json({ message: 'Comment content is required' })
  }

  try {
    let recipe = null
    if (!isExternal) {
      recipe = await prisma.recipe.findUnique({ where: { id: parseInt(id) } })
      if (!recipe) {
        return res.status(404).json({ message: 'Recipe not found' })
      }
    }

    let comment, notification

    await prisma.$transaction(async (tx) => {
      comment = await tx.recipeComment.create({
        data: {
          content: content.trim(),
          user: { connect: { id: req.user.id } },
          ...(isExternal
            ? { isExternal: true, externalId: id }
            : { recipe: { connect: { id: parseInt(id) } } }),
        },
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
      })

      if (!isExternal) {
        notification = await createNotification(tx, {
          recipientId: recipe.authorId,
          actorId: req.user.id,
          type: 'COMMENT',
          entityType: 'comment',   // was: 'recipe' — wrong
          entityId: comment.id,     // was: recipe.id — wrong, not unique per comment
        })
      }
    })

    emitNotification(notification)

    res.status(201).json(comment)
  } catch (error) {
    console.error('Create comment error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// PATCH /api/recipes/comments/:commentId
const editComment = async (req, res) => {
  const commentId = Number(req.params.commentId)
  const { content } = req.body

  if (!content || !content.trim()) {
    return res.status(400).json({ message: 'Comment content is required' })
  }

  try {
    const comment = await prisma.recipeComment.findUnique({ where: { id: commentId } })

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' })
    }
    if (comment.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    const updated = await prisma.recipeComment.update({
      where: { id: commentId },
      data: { content: content.trim(), editedAt: new Date() },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    })

    res.json(updated)
  } catch (error) {
    console.error('editComment error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// DELETE /api/recipes/comments/:commentId
const deleteComment = async (req, res) => {
  const commentId = Number(req.params.commentId)

  try {
    const comment = await prisma.recipeComment.findUnique({ where: { id: commentId } })

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' })
    }
    if (comment.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    let recipe = null
    if (!comment.isExternal && comment.recipeId) {
      recipe = await prisma.recipe.findUnique({
        where: { id: comment.recipeId },
        select: { id: true, authorId: true },
      })
    }

    await prisma.$transaction(async (tx) => {
      await tx.recipeComment.delete({ where: { id: commentId } })

      // Notification has no FK to RecipeComment, so it doesn't cascade —
      // this delete is the only thing that removes it.
      if (recipe) {
        await deleteNotification(tx, {
          recipientId: recipe.authorId,
          actorId: comment.userId,
          type: 'COMMENT',
          entityType: 'comment',
          entityId: comment.id,
        })
      }
    })

    res.json({ message: 'Comment deleted' })
  } catch (error) {
    console.error('deleteComment error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// GET /api/recipes/comments/:commentId/context
// COMMENT notifications store the comment's id (see createComment — entityId
// must stay unique per comment for deleteNotification to target correctly),
// not the recipe's. This resolves comment -> recipe for notification clicks.
const getCommentContext = async (req, res) => {
  const commentId = Number(req.params.commentId)

  try {
    const comment = await prisma.recipeComment.findUnique({
      where: { id: commentId },
      select: { recipeId: true, isExternal: true, externalId: true },
    })

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' })
    }

    res.json(comment)
  } catch (error) {
    console.error('getCommentContext error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

module.exports = { getComments, createComment, editComment, deleteComment, getCommentContext }