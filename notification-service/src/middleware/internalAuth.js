import { config } from '../config/index.js';

export function internalAuth(req, res, next) {
  const internalApiKey = req.headers['x-internal-api-key'];
  const userId = req.headers['x-user-id'];

  // Check internal service key
  if (internalApiKey && internalApiKey === config.internalApiKey) {
    if (userId) {
      req.userId = userId;
    }
    return next();
  }

  // Allow if x-user-id is supplied and we are in development mode, otherwise reject
  if (config.env === 'development' && userId) {
    req.userId = userId;
    return next();
  }

  return res.status(403).json({
    success: false,
    error: {
      code: 'FORBIDDEN',
      message: 'Access restricted to internal API Gateway',
      requestId: req.correlationId
    }
  });
}
