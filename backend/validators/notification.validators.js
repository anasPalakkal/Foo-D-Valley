const { z } = require('zod')

const numericIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'id must be numeric'),
})

module.exports = { numericIdParamSchema }