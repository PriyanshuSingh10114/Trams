import { createApp } from './app.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { prisma } from './repositories/prisma.js';
import { natsClient } from './events/natsClient.js';
import { outboxPublisher } from './events/outboxPublisher.js';

async function bootstrap() {
  const app = createApp();

  // Connect to NATS JetStream
  try {
    await natsClient.connect();
    // Start Outbox background poller
    outboxPublisher.start(5000);
  } catch (err) {
    logger.warn('Initial NATS connection failed, will retry in background', { error: err.message });
  }

  const server = app.listen(config.port, () => {
    logger.info(`User Service listening on port ${config.port}`, {
      env: config.env,
      service: config.serviceName
    });
  });

  // Graceful shutdown handling
  let isShuttingDown = false;
  async function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    // Stop accepting new connections
    server.close(async () => {
      logger.info('HTTP server closed');

      // Stop Outbox publisher
      outboxPublisher.stop();

      // Close NATS connection
      await natsClient.close();

      // Disconnect Prisma
      try {
        await prisma.$disconnect();
        logger.info('Database connections closed cleanly');
      } catch (err) {
        logger.error('Error disconnecting database', { error: err.message });
      }

      logger.info('Graceful shutdown completed. Exiting process.');
      process.exit(0);
    });

    // Force exit if hanging
    setTimeout(() => {
      logger.error('Graceful shutdown timed out. Forcing process exit.');
      process.exit(1);
    }, 10000);
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

bootstrap().catch((error) => {
  logger.error('Fatal bootstrap error in User Service', { error: error.message, stack: error.stack });
  process.exit(1);
});
