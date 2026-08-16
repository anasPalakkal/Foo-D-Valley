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
        author: { select: { id: true, name: true, avatarUrl: true } },
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
        author: { select: { id: true, name: true, avatarUrl: true } },
      },
    })

    res.json(updated)
  } catch (error) {
    console.error('Update recipe error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// GET /api/recipes
// Supports server-side pagination and filtering for internal (community) recipes.
// Query params:
//   page      - page number, default 1
//   limit     - page size, default 12
//   sort      - 'newest' | 'popular' | 'az' | 'za', default 'newest'
//   category  - filter by category string (case-insensitive)
//   cuisine   - filter by cuisine string (case-insensitive)
//   search    - full-text filter on title
//   source    - 'following' requires auth; filters to followed-user recipes only
const getRecipes = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 12))
  const skip = (page - 1) * limit
  const { sort = 'newest', category, cuisine, search, source } = req.query

  try {
    // Build WHERE clause
    const where = {
      isExternal: false,
      author: { isDeleted: false },
    }

    if (category && category !== 'all') {
      where.category = { equals: category, mode: 'insensitive' }
    }

    if (cuisine && cuisine !== 'all') {
      where.cuisine = { equals: cuisine, mode: 'insensitive' }
    }

    if (search && search.trim()) {
      where.title = { contains: search.trim(), mode: 'insensitive' }
    }

    // 'following' filter: only recipes from users the current user follows
    if (source === 'following' && req.user) {
      const following = await prisma.follow.findMany({
        where: { followerId: req.user.id },
        select: { followingId: true },
      })
      const followingIds = following.map((f) => f.followingId)
      // If user follows nobody, return empty rather than all recipes
      where.authorId = followingIds.length > 0 ? { in: followingIds } : { in: [] }
    }

    // Build ORDER BY
    const orderBy =
      sort === 'popular'
        ? { likes: { _count: 'desc' } }
        : sort === 'az'
        ? { title: 'asc' }
        : sort === 'za'
        ? { title: 'desc' }
        : { createdAt: 'desc' } // 'newest' default

    // Run count and data fetch in parallel
    const [total, recipes] = await Promise.all([
      prisma.recipe.count({ where }),
      prisma.recipe.findMany({
        where,
        include: {
          author: { select: { id: true, name: true, avatarUrl: true } },
          _count: { select: { likes: true, comments: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
    ])

    const result = req.user
      ? await attachIsLiked(recipes, req.user.id)
      : recipes.map((r) => ({ ...r, isLiked: false }))

    res.json({
      recipes: result,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    })
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
        author: { select: { id: true, name: true, avatarUrl: true } },
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

// GET /api/recipes/popular?limit=5
const getPopularRecipes = async (req, res) => {
  const limit = parseInt(req.query.limit) || 5

  try {
    const [topInternal, externalGroups] = await Promise.all([
      prisma.recipe.findMany({
        where: { isExternal: false, author: { isDeleted: false } },
        include: {
          author: { select: { id: true, name: true, avatarUrl: true } },
          _count: { select: { likes: true, comments: true } },
        },
        orderBy: { likes: { _count: 'desc' } },
        take: limit,
      }),
      prisma.recipeLike.groupBy({
        by: ['externalId'],
        where: { isExternal: true, user: { isDeleted: false } },
        _count: true,
      }),
    ])

    const internalItems = topInternal.map((r) => ({
      isExternal: false,
      likesCount: r._count.likes,
      recipe: r,
    }))

    const externalItems = externalGroups
      .map((g) => ({ isExternal: true, likesCount: g._count, externalId: g.externalId }))
      .sort((a, b) => b.likesCount - a.likesCount)
      .slice(0, limit)

    const merged = [...internalItems, ...externalItems]
      .sort((a, b) => b.likesCount - a.likesCount)
      .slice(0, limit)

    res.json(merged)
  } catch (error) {
    console.error('Get popular recipes error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// GET /api/recipes/feed?limit=4
const getFeed = async (req, res) => {
  const limit = parseInt(req.query.limit) || 4

  try {
    let isFollowingFeed = false
    let recipes = []

    if (req.user) {
      const following = await prisma.follow.findMany({
        where: { followerId: req.user.id },
        select: { followingId: true },
      })
      const followingIds = following.map((f) => f.followingId)

      if (followingIds.length > 0) {
        recipes = await prisma.recipe.findMany({
          where: {
            authorId: { in: followingIds },
            isExternal: false,
            author: { isDeleted: false },
          },
          include: {
            author: { select: { id: true, name: true, avatarUrl: true } },
            _count: { select: { likes: true, comments: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        })
        isFollowingFeed = recipes.length > 0
      }
    }

    if (!isFollowingFeed) {
      recipes = await prisma.recipe.findMany({
        where: { isExternal: false, author: { isDeleted: false } },
        include: {
          author: { select: { id: true, name: true, avatarUrl: true } },
          _count: { select: { likes: true, comments: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })
    }

    res.json({ isFollowingFeed, recipes })
  } catch (error) {
    console.error('Get feed error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

// GET /api/recipes/recommendations?limit=8
const getRecommendations = async (req, res) => {
  const limit = parseInt(req.query.limit) || 8

  try {
    const [likes, favorites] = await Promise.all([
      prisma.recipeLike.findMany({
        where: { userId: req.user.id, recipeId: { not: null } },
        select: { recipeId: true, recipe: { select: { category: true, cuisine: true } } },
      }),
      prisma.favorite.findMany({
        where: { userId: req.user.id, recipeId: { not: null } },
        select: { recipeId: true, recipe: { select: { category: true, cuisine: true } } },
      }),
    ])

    const categoryCounts = {}
    const cuisineCounts = {}
    const seenRecipeIds = new Set()

    for (const { recipeId, recipe } of [...likes, ...favorites]) {
      if (recipeId) seenRecipeIds.add(recipeId)
      if (recipe?.category) categoryCounts[recipe.category] = (categoryCounts[recipe.category] || 0) + 1
      if (recipe?.cuisine) cuisineCounts[recipe.cuisine] = (cuisineCounts[recipe.cuisine] || 0) + 1
    }

    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null
    const topCuisine = Object.entries(cuisineCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null

    if (!topCategory && !topCuisine) {
      return res.json({ basis: null, recipes: [] })
    }

    const recipes = await prisma.recipe.findMany({
      where: {
        isExternal: false,
        authorId: { not: req.user.id },
        id: { notIn: Array.from(seenRecipeIds) },
        author: { isDeleted: false },
        OR: [
          ...(topCategory ? [{ category: topCategory }] : []),
          ...(topCuisine ? [{ cuisine: topCuisine }] : []),
        ],
      },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { likes: true, comments: true } },
      },
      orderBy: { likes: { _count: 'desc' } },
      take: limit,
    })

    const result = await attachIsLiked(recipes, req.user.id)

    res.json({ basis: { category: topCategory, cuisine: topCuisine }, recipes: result })
  } catch (error) {
    console.error('Get recommendations error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

module.exports = {
  createRecipe,
  updateRecipe,
  getRecipes,
  getRecipeById,
  deleteRecipe,
  getPopularRecipes,
  getFeed,
  getRecommendations,
}