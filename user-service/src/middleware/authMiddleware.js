import { verifyToken } from '../utils/jwt.js';
import { config } from '../config/index.js';

export function authenticate(req, res, next) {
  const internalApiKey = req.headers['x-internal-api-key'];
  const userIdFromGateway = req.headers['x-user-id'];
  const userEmailFromGateway = req.headers['x-user-email'];

  // Trust Gateway headers if internal API key matches
  if (internalApiKey && internalApiKey === config.internalApiKey && userIdFromGateway) {
    req.user = {
      id: userIdFromGateway,
      email: userEmailFromGateway
    };
    return next();
  }

  // Fallback to Bearer JWT directly
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token is missing or invalid',
        requestId: req.correlationId
      }
    });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Authentication token is expired or invalid',
        requestId: req.correlationId
      }
    });
  }

  req.user = {
    id: decoded.sub,
    email: decoded.email
  };

  next();
}
