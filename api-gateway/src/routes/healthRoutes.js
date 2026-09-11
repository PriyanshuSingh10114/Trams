import { Router } from 'express';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export const healthRoutes = Router();

healthRoutes.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: config.serviceName,
    timestamp: new Date().toISOString()
  });
});

healthRoutes.get('/ready', async (req, res) => {
  const checks = {
    userService: 'down',
    notificationService: 'down'
  };

  let isReady = true;

  try {
    const userRes = await fetch(`${config.userServiceUrl}/ready`, { signal: AbortSignal.timeout(3000) });
    if (userRes.ok) {
      checks.userService = 'up';
    } else {
      checks.userService = 'unhealthy';
      isReady = false;
    }
  } catch (err) {
    logger.warn('User Service health check failed', { error: err.message });
    checks.userService = 'unreachable';
    isReady = false;
  }

  try {
    const notifRes = await fetch(`${config.notificationServiceUrl}/ready`, { signal: AbortSignal.timeout(3000) });
    if (notifRes.ok) {
      checks.notificationService = 'up';
    } else {
      checks.notificationService = 'unhealthy';
      isReady = false;
    }
  } catch (err) {
    logger.warn('Notification Service health check failed', { error: err.message });
    checks.notificationService = 'unreachable';
    isReady = false;
  }

  const statusCode = isReady ? 200 : 503;
  res.status(statusCode).json({
    status: isReady ? 'ready' : 'unhealthy',
    service: config.serviceName,
    checks,
    timestamp: new Date().toISOString()
  });
});
