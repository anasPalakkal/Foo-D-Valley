const prisma = require('../lib/prismaClient')
const { cloudinary } = require('../lib/cloudinary')

const attachIsLiked = async (recipes, userId) => {
  const recipeIds = recipes.map((r) => r.id)
  const likes = await prisma.recipeLike.findMany({
    where: { userId, recipeId: { in: recipeIds } },
    select: { recipeId: true },
  })
  const likedSet = new Set(likes.map((l) => l.recipeId))
  return recipes.map((r) => ({ ...r, isLiked: likedSet.has(r.id) }))
}

// POST /api/recipes
const createRecipe = async (req, res) => {
  const { title, description, ingredients, instructions, category, cuisine } = req.body

  if (!title || !ingredients || !instructions) {
    return res.status(400).json({ message: 'Title, ingredients and instructions are required' })
  }

  try {
    const imageUrl = req.file ? req.file.path : null

    const recipe = await prisma.recipe.create({
      data: {
        title,
        description: description || null,
        category: category || null,
        cuisine: cuisine || null,
        ingredients: Array.isArray(ingredients) ? ingredients : JSON.parse(ingredients),
        instructions: Array.isArray(instructions) ? instructions : JSON.parse(instructions),
        imageUrl,
        isExternal: false,
        author: { connect: { id: req.user.id } },
      },
      include: {
        author: { select: { id: true, name: true } },
      },
    })

    res.status(201).json(recipe)
  } catch (error) {
    console.error('Create recipe error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// PUT /api/recipes/:id
const updateRecipe = async (req, res) => {
  const id = parseInt(req.params.id)
  const { title, description, ingredients, instructions, category, cuisine } = req.body

  try {
    const existing = await prisma.recipe.findUnique({ where: { id } })

    if (!existing) {
      return res.status(404).json({ message: 'Recipe not found' })
    }

    if (existing.authorId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    let imageUrl = existing.imageUrl

    if (req.file) {
      if (existing.imageUrl) {
        const publicId = existing.imageUrl.split('/').slice(-2).join('/').split('.')[0]
        await cloudinary.uploader.destroy(publicId)
      }
      imageUrl = req.file.path
    }

    const updated = await prisma.recipe.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(cuisine !== undefined && { cuisine }),
        ...(ingredients && {
          ingredients: Array.isArray(ingredients) ? ingredients : JSON.parse(ingredients),
        }),
        ...(instructions && {
          instructions: Array.isArray(instructions) ? instructions : JSON.parse(instructions),
        }),
        imageUrl,
      },
      include: {
        author: { select: { id: true, name: true } },
      },
    })

    res.json(updated)
  } catch (error) {
    console.error('Update recipe error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// GET /api/recipes?sort=popular
const getRecipes = async (req, res) => {
  const { sort } = req.query

  try {
    const recipes = await prisma.recipe.findMany({
      where: { isExternal: false, author: { isDeleted: false } },
      include: {
        author: { select: { id: true, name: true } },
        _count: { select: { likes: true, comments: true } },
      },
      orderBy:
        sort === 'popular'
          ? { likes: { _count: 'desc' } }
          : { createdAt: 'desc' },
    })

    const result = req.user
      ? await attachIsLiked(recipes, req.user.id)
      : recipes.map((r) => ({ ...r, isLiked: false }))

    res.json(result)
  } catch (error) {
    console.error('Get recipes error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// GET /api/recipes/:id
const getRecipeById = async (req, res) => {
  const id = parseInt(req.params.id)

  try {
    const recipe = await prisma.recipe.findFirst({
      where: { id, author: { isDeleted: false } },
      include: {
        author: { select: { id: true, name: true } },
        _count: { select: { likes: true, comments: true } },
      },
    })

    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' })
    }

    let isLiked = false
    if (req.user) {
      const like = await prisma.recipeLike.findUnique({
        where: { userId_recipeId: { userId: req.user.id, recipeId: id } },
      })
      isLiked = !!like
    }

    res.json({ ...recipe, isLiked })
  } catch (error) {
    console.error('Get recipe error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// DELETE /api/recipes/:id
const deleteRecipe = async (req, res) => {
  const id = parseInt(req.params.id)

  try {
    const recipe = await prisma.recipe.findUnique({ where: { id } })

    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' })
    }

    if (recipe.authorId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this recipe' })
    }

    if (recipe.imageUrl) {
      const publicId = recipe.imageUrl.split('/').slice(-2).join('/').split('.')[0]
      await cloudinary.uploader.destroy(publicId)
    }

    await prisma.recipe.delete({ where: { id } })

    res.json({ message: 'Recipe deleted' })
  } catch (error) {
    console.error('Delete recipe error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

module.exports = { createRecipe, updateRecipe, getRecipes, getRecipeById, deleteRecipe }