const prisma = require('../lib/prismaClient')

const getLikesCount = async (id, isExternal) => {
  if (isExternal) {
    return prisma.recipeLike.count({
      where: { externalId: id, user: { isDeleted: false } },
    })
  }
  return prisma.recipeLike.count({
    where: { recipeId: parseInt(id), user: { isDeleted: false } },
  })
}

// GET /api/recipes/:id/likes?type=external
const getLikeStatus = async (req, res) => {
  const { id } = req.params
  const isExternal = req.query.type === 'external'

  try {
    const likesCount = await getLikesCount(id, isExternal)

    let isLiked = false
    if (req.user) {
      const where = isExternal
        ? { userId_externalId: { userId: req.user.id, externalId: id } }
        : { userId_recipeId: { userId: req.user.id, recipeId: parseInt(id) } }
      const like = await prisma.recipeLike.findUnique({ where })
      isLiked = !!like
    }

    res.json({ likesCount, isLiked })
  } catch (error) {
    console.error('Get like status error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// POST /api/recipes/:id/like?type=external
const likeRecipe = async (req, res) => {
  const { id } = req.params
  const isExternal = req.query.type === 'external'

  try {
    if (!isExternal) {
      const recipe = await prisma.recipe.findUnique({ where: { id: parseInt(id) } })
      if (!recipe) {
        return res.status(404).json({ message: 'Recipe not found' })
      }
    }

    await prisma.recipeLike.create({
      data: {
        user: { connect: { id: req.user.id } },
        ...(isExternal
          ? { isExternal: true, externalId: id }
          : { recipe: { connect: { id: parseInt(id) } } }),
      },
    })

    const likesCount = await getLikesCount(id, isExternal)
    res.status(201).json({ liked: true, likesCount })
  } catch (error) {
    if (error.code === 'P2002') {
      const likesCount = await getLikesCount(id, isExternal)
      return res.status(200).json({ liked: true, likesCount })
    }
    console.error('Like recipe error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// DELETE /api/recipes/:id/like?type=external
const unlikeRecipe = async (req, res) => {
  const { id } = req.params
  const isExternal = req.query.type === 'external'

  try {
    if (isExternal) {
      await prisma.recipeLike.deleteMany({ where: { userId: req.user.id, externalId: id } })
    } else {
      await prisma.recipeLike.deleteMany({ where: { userId: req.user.id, recipeId: parseInt(id) } })
    }

    const likesCount = await getLikesCount(id, isExternal)
    res.json({ liked: false, likesCount })
  } catch (error) {
    console.error('Unlike recipe error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// POST /api/recipes/likes/batch
// body: { recipeIds: [1,2,3], externalIds: ["52772","52773"] }
const getBatchLikeCounts = async (req, res) => {
  const { recipeIds = [], externalIds = [] } = req.body

  try {
    const recipeGroups = recipeIds.length
      ? await prisma.recipeLike.groupBy({
        by: ['recipeId'],
        where: { recipeId: { in: recipeIds.map(Number) }, user: { isDeleted: false } },
        _count: true,
      })
      : []

    const externalGroups = externalIds.length
      ? await prisma.recipeLike.groupBy({
        by: ['externalId'],
        where: { externalId: { in: externalIds }, user: { isDeleted: false } },
        _count: true,
      })
      : []
      
    const recipeCounts = {}
    recipeGroups.forEach((g) => { recipeCounts[g.recipeId] = g._count })

    const externalCounts = {}
    externalGroups.forEach((g) => { externalCounts[g.externalId] = g._count })

    res.json({ recipeCounts, externalCounts })
  } catch (error) {
    console.error('Batch like counts error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

module.exports = { getLikeStatus, likeRecipe, unlikeRecipe, getBatchLikeCounts }