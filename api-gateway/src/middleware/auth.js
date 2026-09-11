import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export function verifyJwt(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token is required. Please provide a Bearer token.',
        requestId: req.correlationId
      }
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = {
      id: decoded.sub,
      email: decoded.email
    };
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: error.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid authentication token',
        requestId: req.correlationId
      }
    });
  }
}
