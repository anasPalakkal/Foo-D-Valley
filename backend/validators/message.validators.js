const { z } = require('zod')

const numericIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'id must be numeric'),
})

const editMessageSchema = z.object({
  content: z.string().min(1).max(2000),
})

module.exports = { numericIdParamSchema, editMessageSchema }