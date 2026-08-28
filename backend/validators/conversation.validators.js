const { z } = require('zod')

const numericIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'id must be numeric'),
})

const createConversationSchema = z.object({
  recipientUserId: z.number().int().positive(),
})

const markReadSchema = z.object({
  messageId: z.number().int().positive(),
})

const toggleMuteSchema = z.object({
  isMuted: z.boolean(),
})

module.exports = { numericIdParamSchema, createConversationSchema, markReadSchema, toggleMuteSchema }