export function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      const formattedErrors = error.errors?.map(e => ({
        field: e.path.join('.'),
        message: e.message
      })) || [{ message: error.message }];

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request payload',
          details: formattedErrors,
          requestId: req.correlationId
        }
      });
    }
  };
}

export function validateParams(schema) {
  return (req, res, next) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid path parameters',
          details: error.errors,
          requestId: req.correlationId
        }
      });
    }
  };
}
