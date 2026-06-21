const prisma = require('../lib/prismaClient')
const { cloudinary } = require('../lib/cloudinary')

// POST /api/recipes — upload a new recipe
const createRecipe = async (req, res) => {
  const { title, description, ingredients, instructions } = req.body

  if (!title || !ingredients || !instructions) {
    return res.status(400).json({ message: 'Title, ingredients and instructions are required' })
  }

  try {
    const imageUrl = req.file ? req.file.path : null

    const recipe = await prisma.recipe.create({
      data: {
        title,
        description: description || null,
        ingredients: Array.isArray(ingredients) ? ingredients : ingredients.split(','),
        instructions: Array.isArray(instructions) ? instructions : instructions.split(','),
        imageUrl,
        isExternal: false,
        authorId: req.user.id
      }
    })

    res.status(201).json(recipe)
  } catch (error) {
    console.error('Create recipe error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// GET /api/recipes — get all user uploaded recipes
const getRecipes = async (req, res) => {
  try {
    const recipes = await prisma.recipe.findMany({
      where: { isExternal: false },
      include: {
        author: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json(recipes)
  } catch (error) {
    console.error('Get recipes error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// GET /api/recipes/:id — get single recipe
const getRecipeById = async (req, res) => {
  const id = parseInt(req.params.id)

  try {
    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, name: true }
        }
      }
    })

    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' })
    }

    res.json(recipe)
  } catch (error) {
    console.error('Get recipe error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// DELETE /api/recipes/:id — delete a recipe (only author can delete)
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

    // delete image from cloudinary if exists
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

module.exports = { createRecipe, getRecipes, getRecipeById, deleteRecipe }