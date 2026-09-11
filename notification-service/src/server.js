import { createApp } from './app.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { prisma } from './repositories/prisma.js';
import { userEventsConsumer } from './consumers/userEventsConsumer.js';

async function bootstrap() {
  const app = createApp();

  // Connect to NATS JetStream Consumer
  try {
    await userEventsConsumer.connect();
  } catch (err) {
    logger.warn('Initial NATS consumer connection failed, will retry in background', { error: err.message });
  }

  const server = app.listen(config.port, () => {
    logger.info(`Notification Service listening on port ${config.port}`, {
      env: config.env,
      service: config.serviceName
    });
  });

  // Graceful shutdown
  let isShuttingDown = false;
  async function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`Received ${signal}. Starting graceful shutdown of Notification Service...`);

    server.close(async () => {
      logger.info('Notification Service HTTP server closed');

      // Stop consumer and close NATS connection
      await userEventsConsumer.close();

      // Disconnect Prisma
      try {
        await prisma.$disconnect();
        logger.info('Notification database connection closed cleanly');
      } catch (err) {
        logger.error('Error disconnecting notification database', { error: err.message });
      }

      logger.info('Graceful shutdown of Notification Service completed. Exiting.');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Graceful shutdown timed out. Forcing process exit.');
      process.exit(1);
    }, 10000);
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

bootstrap().catch((error) => {
  logger.error('Fatal bootstrap error in Notification Service', { error: error.message, stack: error.stack });
  process.exit(1);
});
