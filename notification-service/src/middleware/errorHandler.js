import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  const correlationId = req.correlationId || 'unknown';

  logger.error('Unhandled error in Notification Service', {
    error: err.message,
    stack: err.stack,
    correlationId
  });

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred in Notification Service',
      requestId: correlationId
    }
  });
}
