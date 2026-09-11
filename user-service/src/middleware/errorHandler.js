import { logger } from '../utils/logger.js';
import { AppError } from '../services/authService.js';

export function errorHandler(err, req, res, next) {
  const correlationId = req.correlationId || 'unknown';

  if (err instanceof AppError) {
    logger.warn(`Application error: ${err.message}`, {
      code: err.code,
      statusCode: err.statusCode,
      correlationId
    });

    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        requestId: correlationId
      }
    });
  }

  // Unhandled error
  logger.error('Unhandled internal server error', {
    error: err.message,
    stack: err.stack,
    correlationId
  });

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred',
      requestId: correlationId
    }
  });
}
