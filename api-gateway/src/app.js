import express from 'express';
import { securityHeaders, corsMiddleware } from './middleware/security.js';
import { correlationIdMiddleware } from './middleware/correlationId.js';
import { generalRateLimiter, authRateLimiter } from './middleware/rateLimiter.js';
import { verifyJwt } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { healthRoutes } from './routes/healthRoutes.js';
import { docsRoutes } from './routes/docsRoutes.js';
import { userServiceProxy, notificationServiceProxy } from './proxy/serviceProxy.js';

export function createApp() {
  const app = express();

  // Basic security and parsing
  app.use(securityHeaders);
  app.use(corsMiddleware);
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Correlation ID
  app.use(correlationIdMiddleware);

  // Health and Documentation
  app.use('/', healthRoutes);
  app.use('/api-docs', docsRoutes);

  // Auth rate limiting on registration and login
  app.use('/api/users/register', authRateLimiter);
  app.use('/api/users/login', authRateLimiter);

  // General rate limiting on all /api routes
  app.use('/api', generalRateLimiter);

  // JWT verification on protected user endpoints
  app.use('/api/users/me', verifyJwt);

  // JWT verification on protected notification endpoints
  app.use('/api/notifications', verifyJwt);

  // Reverse Proxies
  app.use(userServiceProxy);
  app.use(notificationServiceProxy);

  // 404 Fallback
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `Endpoint ${req.method} ${req.originalUrl} does not exist on API Gateway`,
        requestId: req.correlationId
      }
    });
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}
