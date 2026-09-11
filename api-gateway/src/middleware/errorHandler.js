import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  const correlationId = req.correlationId || 'unknown';

  logger.error('Unhandled error in API Gateway', {
    error: err.message,
    stack: err.stack,
    correlationId
  });

  return res.status(500).json({
    success: false,
    error: {
      code: 'GATEWAY_ERROR',
      message: 'An unexpected internal error occurred in the API Gateway',
      requestId: correlationId
    }
  });
}
