const { z } = require('zod')

const chatSchema = z.object({
  prompt: z.string().trim().min(3).max(500),
})

// One contract for ElaAI output and for the save endpoint.
const recipeSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullish(),
  servings: z.number().int().min(1).max(100).nullish(),
  prepTimeMinutes: z.number().int().min(0).max(10000).nullish(),
  cookTimeMinutes: z.number().int().min(0).max(10000).nullish(),
  ingredients: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(200),
        quantity: z.number().positive().max(100000).nullish(),
        unit: z.string().trim().max(50).nullish(),
      })
    )
    .min(1)
    .max(100),
  steps: z
    .array(z.object({ content: z.string().trim().min(1).max(2000) }))
    .min(1)
    .max(100),
  imageUrl: z.string().url().max(2000).startsWith('https://').nullish(),
  imageCredit: z.string().trim().max(300).nullish(),
})

const idParamSchema = z.object({ id: z.coerce.number().int().positive() })

module.exports = { chatSchema, recipeSchema, idParamSchema }