/**
 * Generic Zod-schema-runner middleware. Validates a request source
 * (body/params/query) against the given schema and rejects with
 * field-level errors before controller logic ever sees the request.
 *
 * source defaults to 'body' to match existing usage on auth routes.
 * Pass 'params' or 'query' explicitly for route-param / query validation.
 *
 * Usage: router.post('/register', validate(registerSchema), register)
 *        router.get('/:id', validate(idParamSchema, 'params'), getRecipeById)
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      return res.status(400).json({
        message: details[0]?.message || 'Validation failed',
        details,
      });
    }

    req.body = result.data;
    next();
  };
}

module.exports = { validate };