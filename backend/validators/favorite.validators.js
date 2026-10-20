const { z } = require('zod');

/**
 * addFavorite branches on isExternal: external favorites require
 * externalId (and carry externalName/externalImage), internal favorites
 * require recipeId. A plain z.object() can't express "this field is
 * required only if that field is true" — hence superRefine below instead
 * of trying to force this into a discriminatedUnion (which would require
 * isExternal to always be present and typed consistently, and the
 * existing frontend may not always send it for internal favorites).
 */
const addFavoriteSchema = z
  .object({
    isExternal: z.boolean().optional().default(false),
    recipeId: z.union([z.string(), z.number()]).optional(),
    externalId: z.string().trim().max(50).optional(),
    externalName: z.string().trim().max(200).optional(),
    externalImage: z.string().trim().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isExternal) {
      if (!data.externalId || !data.externalId.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['externalId'],
          message: 'externalId is required for external recipes',
        });
      }
      return;
    }

    if (data.recipeId === undefined || data.recipeId === null || data.recipeId === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recipeId'],
        message: 'recipeId is required',
      });
      return;
    }

    const n = Number(data.recipeId);
    if (!Number.isInteger(n) || n <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recipeId'],
        message: 'recipeId must be a positive integer',
      });
    }
  });

/**
 * Not a Zod schema — same reasoning as validateRecipeIdParam in
 * recipe.validators.js. removeFavorite's :recipeId param means either an
 * internal numeric id or an external id, depending on ?type=external, so
 * it needs params + query checked together.
 */
function validateFavoriteIdParam(req, res, next) {
  const { recipeId } = req.params;
  const type = req.query.type ?? 'internal';
  if (!['internal', 'external', 'ai'].includes(type)) {
    return res.status(400).json({
      error: 'Validation failed',
      details: [{ field: 'type', message: 'Invalid type' }],
    });
  }
  const isExternal = type === 'external';
  
  if (!isExternal) {
    if (!/^\d+$/.test(recipeId)) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [{ field: 'recipeId', message: 'recipeId must be numeric' }],
      });
    }
    return next();
  }

  if (!recipeId || recipeId.length > 50) {
    return res.status(400).json({
      error: 'Validation failed',
      details: [{ field: 'recipeId', message: 'Invalid external id' }],
    });
  }
  next();
}

module.exports = { addFavoriteSchema, validateFavoriteIdParam };