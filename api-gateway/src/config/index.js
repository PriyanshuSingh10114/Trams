import dotenv from 'dotenv';
dotenv.config();

if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET) {
    throw new Error('[Gateway Config Error] Missing required environment variable: JWT_SECRET');
  }
}

export const config = Object.freeze({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  serviceName: process.env.SERVICE_NAME || 'api-gateway',
  userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:3001',
  notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3002',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-key-at-least-32-characters-long',
  internalApiKey: process.env.INTERNAL_API_KEY || 'internal-service-secret-key-replace-in-production',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
  },
  authRateLimit: {
    windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '15', 10)
  }
});
