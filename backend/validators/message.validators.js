const { z } = require('zod')

const numericIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'id must be numeric'),
})

const editMessageSchema = z.object({
  content: z.string().min(1).max(2000),
})

const sendMessageSchema = z.object({
  conversationId: z.number().int().positive(),
  clientId: z.string().min(1).max(100),
  type: z.enum(['TEXT', 'IMAGE', 'RECIPE']), // SYSTEM is server-generated only, never client-sent
  content: z.string().max(2000).optional(),
  imageUrl: z.string().url().optional(),
  imagePublicId: z.string().optional(),
  recipeId: z.number().int().positive().optional(),
}).superRefine((data, ctx) => {
  if (data.type === 'TEXT' && !data.content?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'content is required for TEXT messages', path: ['content'] })
  }
  if (data.type === 'IMAGE' && !data.imageUrl) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'imageUrl is required for IMAGE messages', path: ['imageUrl'] })
  }
  if (data.type === 'RECIPE' && !data.recipeId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'recipeId is required for RECIPE messages', path: ['recipeId'] })
  }
})

module.exports = { numericIdParamSchema, editMessageSchema, sendMessageSchema}