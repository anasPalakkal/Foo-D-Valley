const prisma = require('../lib/prismaClient')
const { consume, refund } = require('../lib/dailyQuota')
const { generate, ElaAiError } = require('../services/elaai.service')
const { recipeSchema } = require('../validators/assistant.validators')

const USER_LIMIT = Number(process.env.ASSISTANT_USER_DAILY_LIMIT) || 3
const GLOBAL_LIMIT = Number(process.env.ASSISTANT_GLOBAL_DAILY_LIMIT) || 15
const MAX_SAVED_AI_RECIPES = 30
const REFUSAL = 'I can only help with recipes and cooking. Try describing a dish you would like to make.'

const chat = async (req, res) => {
  let userQuota
  let globalQuota

  // Fail closed: if Redis is down, do not call ElaAI.
  try {
    userQuota = await consume(`assistant:user:${req.user.id}`, USER_LIMIT)
    if (!userQuota.ok) {
      return res.status(429).json({
        code: 'DAILY_LIMIT',
        message: 'You have used all your assistant requests for today. Try again tomorrow.',
        remaining: 0,
      })
    }

    globalQuota = await consume('assistant:global', GLOBAL_LIMIT)
    if (!globalQuota.ok) {
      await refund(userQuota.key)
      return res.status(503).json({
        code: 'GLOBAL_LIMIT',
        message: 'The assistant has reached its daily capacity. Please try again tomorrow.',
      })
    }
  } catch (err) {
    console.error('assistant quota error:', err)
    if (userQuota?.ok) await refund(userQuota.key)
    return res.status(503).json({ code: 'UNAVAILABLE', message: 'Assistant is temporarily unavailable.' })
  }

  try {
    const result = await generate(req.body.prompt)
    const remaining = USER_LIMIT - userQuota.used

    if (result.type === 'recipe') {
      const recipe = recipeSchema.parse({
        ...result.recipe,
        imageUrl: result.imageUrl,
        imageCredit: result.imageCredit,
      })
      return res.json({
        reply: { kind: 'recipe', text: `Here is a recipe for ${recipe.title}.`, recipe },
        remaining,
      })
    }

    // Answered or refused: ElaAI spent upstream quota, so the counters stay consumed.
    const text = result.type === 'text' ? result.text.slice(0, 4000) : REFUSAL
    return res.json({ reply: { kind: 'text', text, recipe: null }, remaining })
  } catch (err) {
    console.error('assistant generate error:', err.message)
    await Promise.all([refund(userQuota.key), refund(globalQuota.key)])

    if (err instanceof ElaAiError && err.kind === 'CAPACITY') {
      return res.status(503).json({
        code: 'GLOBAL_LIMIT',
        message: 'The assistant is at capacity right now. Please try again later.',
      })
    }
    return res.status(502).json({
      code: 'UPSTREAM_ERROR',
      message: 'The assistant could not answer right now. This request was not counted. Try again.',
    })
  }
}

const saveRecipe = async (req, res) => {
  const userId = req.user.id
  const { title, description, servings, prepTimeMinutes, cookTimeMinutes, ingredients, steps, imageUrl, imageCredit } = req.body

  try {
    const [count, existing] = await Promise.all([
      prisma.aiRecipe.count({ where: { userId } }),
      prisma.aiRecipe.findFirst({ where: { userId, title }, select: { id: true } }),
    ])

    if (existing) {
      return res.status(409).json({ code: 'ALREADY_SAVED', id: existing.id, message: 'Already saved' })
    }
    if (count >= MAX_SAVED_AI_RECIPES) {
      return res.status(409).json({
        code: 'AI_RECIPE_LIMIT',
        message: `You can keep up to ${MAX_SAVED_AI_RECIPES} assistant recipes. Remove one to save more.`,
      })
    }

    const saved = await prisma.$transaction(async (tx) => {
      const recipe = await tx.aiRecipe.create({
        data: {
          title,
          description: description ?? null,
          servings: servings ?? null,
          prepTimeMinutes: prepTimeMinutes ?? null,
          cookTimeMinutes: cookTimeMinutes ?? null,
          ingredients,
          steps,
          imageUrl: imageUrl ?? null,
          imageCredit: imageCredit ?? null,
          user: { connect: { id: userId } },
        },
      })
      await tx.favorite.create({
        data: {
          user: { connect: { id: userId } },
          aiRecipe: { connect: { id: recipe.id } },
        },
      })
      return recipe
    })

    res.status(201).json({ id: saved.id })
  } catch (err) {
    console.error('saveRecipe error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
}

const formatIngredient = ({ name, quantity, unit }) =>
  [quantity, unit, name].filter((v) => v !== null && v !== undefined && v !== '').join(' ')

const getAiRecipe = async (req, res) => {
  try {
    const recipe = await prisma.aiRecipe.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    })
    if (!recipe) return res.status(404).json({ message: 'Recipe not found' })

    // Same shape RecipeDetails consumes, with ingredients and steps flattened to strings
    res.json({
      id: recipe.id,
      name: recipe.title,
      image: recipe.imageUrl,
      imageCredit: recipe.imageCredit,
      category: null,
      area: null,
      description: recipe.description,
      ingredients: recipe.ingredients.map(formatIngredient),
      instructions: recipe.steps.map((s) => s.content),
      isExternal: false,
      externalId: null,
      author: null,
      isAi: true,
      servings: recipe.servings,
      prepTimeMinutes: recipe.prepTimeMinutes,
      cookTimeMinutes: recipe.cookTimeMinutes,
    })
  } catch (err) {
    console.error('getAiRecipe error:', err)
    res.status(500).json({ message: 'Internal server error' })
  }
}

module.exports = { chat, saveRecipe, getAiRecipe }