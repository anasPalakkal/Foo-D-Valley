const { z } = require('zod');

// Every follow route param is always an internal numeric user id — no
// external/internal branching needed here, unlike recipe/favorite ids.
const userIdParamSchema = z.object({
  userId: z.string().regex(/^\d+$/, 'userId must be numeric').transform(Number),
});

module.exports = { userIdParamSchema };