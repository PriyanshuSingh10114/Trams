import { createProxyMiddleware } from 'http-proxy-middleware';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export const userServiceProxy = createProxyMiddleware({
  target: config.userServiceUrl,
  changeOrigin: true,
  pathRewrite: {
    '^/api/users': '/users'
  },
  on: {
    proxyReq: (proxyReq, req) => {
      // Propagate correlation and request IDs
      if (req.correlationId) {
        proxyReq.setHeader('X-Correlation-ID', req.correlationId);
        proxyReq.setHeader('X-Request-ID', req.correlationId);
      }

      // Propagate internal secret and user info if authenticated
      proxyReq.setHeader('X-Internal-API-Key', config.internalApiKey);
      if (req.user) {
        proxyReq.setHeader('X-User-Id', req.user.id);
        if (req.user.email) {
          proxyReq.setHeader('X-User-Email', req.user.email);
        }
      }

      // If express.json() already parsed the body, restream it to the proxy
      if (req.body && Object.keys(req.body).length > 0) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
    error: (err, req, res) => {
      logger.error('User Service proxy error', { error: err.message, correlationId: req.correlationId });
      if (!res.headersSent) {
        res.status(503).json({
          success: false,
          error: {
            code: 'UPSTREAM_SERVICE_UNAVAILABLE',
            message: 'User Service is temporarily unavailable. Please try again later.',
            requestId: req.correlationId
          }
        });
      }
    }
  }
});

export const notificationServiceProxy = createProxyMiddleware({
  target: config.notificationServiceUrl,
  changeOrigin: true,
  pathRewrite: {
    '^/api/notifications': '/notifications'
  },
  on: {
    proxyReq: (proxyReq, req) => {
      if (req.correlationId) {
        proxyReq.setHeader('X-Correlation-ID', req.correlationId);
        proxyReq.setHeader('X-Request-ID', req.correlationId);
      }

      proxyReq.setHeader('X-Internal-API-Key', config.internalApiKey);
      if (req.user) {
        proxyReq.setHeader('X-User-Id', req.user.id);
      }

      if (req.body && Object.keys(req.body).length > 0) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
    error: (err, req, res) => {
      logger.error('Notification Service proxy error', { error: err.message, correlationId: req.correlationId });
      if (!res.headersSent) {
        res.status(503).json({
          success: false,
          error: {
            code: 'UPSTREAM_SERVICE_UNAVAILABLE',
            message: 'Notification Service is temporarily unavailable. Please try again later.',
            requestId: req.correlationId
          }
        });
      }
    }
  }
});
