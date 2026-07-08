const prisma = require('../lib/prismaClient')

// GET /api/recipes/:id/comments?type=external
const getComments = async (req, res) => {
  const { id } = req.params
  const isExternal = req.query.type === 'external'

  try {
    const where = isExternal ? { externalId: id } : { recipeId: parseInt(id) }

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
    if (!isExternal) {
      const recipe = await prisma.recipe.findUnique({ where: { id: parseInt(id) } })
      if (!recipe) {
        return res.status(404).json({ message: 'Recipe not found' })
      }
    }

    const comment = await prisma.recipeComment.create({
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

    res.status(201).json(comment)
  } catch (error) {
    console.error('Create comment error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

module.exports = { getComments, createComment }