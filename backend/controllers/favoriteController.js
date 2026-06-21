const prisma = require('../lib/prismaClient')

const getFavorites = async (req, res) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.user.id },
      include: { recipe: true },
    })

    res.json(favorites)
  } catch (error) {
    console.error('getFavorites error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const addFavorite = async (req, res) => {
  const { recipeId, isExternal, externalId, externalName, externalImage } = req.body

  try {
    if (isExternal) {
      if (!externalId) {
        return res.status(400).json({ message: 'externalId is required for external recipes' })
      }

      const favorite = await prisma.favorite.create({
        data: {
          user: { connect: { id: req.user.id } },
          isExternal: true,
          externalId,
          externalName,
          externalImage,
        },
      })

      return res.status(201).json(favorite)
    }

    if (!recipeId) {
      return res.status(400).json({ message: 'recipeId is required' })
    }

    const favorite = await prisma.favorite.create({
      data: {
        user: { connect: { id: req.user.id } },
        recipe: { connect: { id: Number(recipeId) } },
      },
    })

    res.status(201).json(favorite)
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'Already favorited' })
    }
    console.error('addFavorite error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const removeFavorite = async (req, res) => {
  const { recipeId } = req.params
  const { type } = req.query

  try {
    if (type === 'external') {
      await prisma.favorite.deleteMany({
        where: { userId: req.user.id, externalId: recipeId },
      })
    } else {
      await prisma.favorite.deleteMany({
        where: { userId: req.user.id, recipeId: Number(recipeId) },
      })
    }

    res.json({ message: 'Removed from favorites' })
  } catch (error) {
    console.error('removeFavorite error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

module.exports = { getFavorites, addFavorite, removeFavorite }