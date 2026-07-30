const { z } = require('zod');
const { cloudinary } = require('../lib/cloudinary');

/**
 * createRecipe/updateRecipe run behind multer (multipart/form-data), so
 * every field — including arrays — arrives as a string. ingredients and
 * instructions are JSON-stringified arrays on the wire. This preprocesses
 * a string field into a real array (parsing JSON) before validating its
 * shape, but leaves non-strings alone in case this route is ever hit with
 * a plain JSON body instead of multipart.
 */
const stringArrayField = (label, { min = 1, max = 50 } = {}) =>
  z.preprocess((val) => {
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch {
        // Let it fall through as-is; z.array() below will fail it with a
        // clear "expected array, received string" message.
        return val;
      }
    }
    return val;
  }, z.array(
    z.string().trim().min(1, `Each ${label} item must not be empty`).max(500, `${label} item is too long`)
  ).min(min, `At least ${min} ${label}(s) required`).max(max, `Too many ${label} items (max ${max})`));

const title = z.string().trim().min(3, 'Title must be at least 3 characters').max(150, 'Title is too long');
const description = z.string().trim().max(2000, 'Description is too long').optional().nullable();
const category = z.string().trim().max(50).optional().nullable();
const cuisine = z.string().trim().max(50).optional().nullable();

const createRecipeSchema = z.object({
  title,
  description,
  category,
  cuisine,
  ingredients: stringArrayField('ingredient'),
  instructions: stringArrayField('instruction', { max: 100 }),
});

// All fields optional on update — controller already does partial updates
// via `...(title && { title })` style spreads, so schema mirrors that.
const updateRecipeSchema = z.object({
  title: title.optional(),
  description,
  category,
  cuisine,
  ingredients: stringArrayField('ingredient').optional(),
  instructions: stringArrayField('instruction', { max: 100 }).optional(),
});

const createCommentSchema = z.object({
  content: z.string().trim().min(1, 'Comment cannot be empty').max(1000, 'Comment is too long (max 1000 chars)'),
});

// Caps array size to stop a huge payload forcing an expensive groupBy query.
const batchLikesSchema = z.object({
  recipeIds: z.array(z.union([z.string(), z.number()])).max(200, 'Too many recipe ids').optional().default([]),
  externalIds: z.array(z.string().max(50)).max(200, 'Too many external ids').optional().default([]),
});

// Pure-internal recipe id (used by GET/PUT/DELETE /:id, no ?type=external
// possibility on those routes).
const numericIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Recipe id must be numeric').transform(Number),
});

/**
 * NOT a Zod schema — a small custom guard. The like/comment routes accept
 * ?type=external, where `id` means an external (TheMealDB) id instead of
 * the internal numeric DB id. A single Zod param schema can't express
 * "numeric if query.type !== external, otherwise a bounded string" cleanly
 * since it needs params AND query together, so this stays a plain
 * middleware function instead of forcing it through validate().
 */
function validateRecipeIdParam(req, res, next) {
  const { id } = req.params;
  const isExternal = req.query.type === 'external';

  if (!isExternal) {
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [{ field: 'id', message: 'Recipe id must be numeric' }],
      });
    }
    return next();
  }

  if (!id || typeof id !== 'string' || id.length > 50) {
    return res.status(400).json({
      error: 'Validation failed',
      details: [{ field: 'id', message: 'Invalid external id' }],
    });
  }
  next();
}

/**
 * Same job as validate() from middleware/validate.js, but specifically for
 * routes behind multer/Cloudinary. CloudinaryStorage uploads the file
 * DURING multer's own processing — before this middleware even runs — so
 * if the body then fails validation, the image is already sitting in
 * Cloudinary with no Recipe row pointing to it. This destroys that orphaned
 * upload before responding, instead of leaking storage silently forever.
 */
function validateRecipeBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      if (req.file && req.file.filename) {
        cloudinary.uploader.destroy(req.file.filename).catch((err) => {
          console.error('Failed to clean up orphaned upload:', err);
        });
      }

      return res.status(400).json({ error: 'Validation failed', details });
    }

    req.body = result.data;
    next();
  };
}

module.exports = {
  createRecipeSchema,
  updateRecipeSchema,
  createCommentSchema,
  batchLikesSchema,
  numericIdParamSchema,
  validateRecipeIdParam,
  validateRecipeBody,
};