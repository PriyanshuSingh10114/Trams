import { prisma } from '../repositories/prisma.js';
import { natsClient } from '../events/natsClient.js';
import { config } from '../config/index.js';

export const healthController = {
  async getHealth(req, res) {
    res.status(200).json({
      status: 'ok',
      service: config.serviceName,
      timestamp: new Date().toISOString()
    });
  },

  async getReadiness(req, res) {
    const checks = {
      database: 'down',
      nats: 'down'
    };

    let isReady = true;

    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = 'up';
    } catch {
      checks.database = 'down';
      isReady = false;
    }

    if (natsClient.isConnected) {
      checks.nats = 'up';
    } else {
      checks.nats = 'down';
      isReady = false;
    }

    const statusCode = isReady ? 200 : 503;
    res.status(statusCode).json({
      status: isReady ? 'ready' : 'unhealthy',
      service: config.serviceName,
      checks,
      timestamp: new Date().toISOString()
    });
  }
};
