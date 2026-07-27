/**
 * Generic Zod-schema-runner middleware. Validates req.body against the
 * given schema and rejects with field-level errors before controller
 * logic (and the DB/bcrypt) ever sees the request.
 *
 * Usage: router.post('/register', validate(registerSchema), register)
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
        error: 'Validation failed',
        details,
      });
    }

    // Replace with parsed data so downstream code gets normalized values
    // (trimmed strings, lowercased email, etc.) instead of raw input.
    req.body = result.data;
    next();
  };
}

module.exports = { validate };