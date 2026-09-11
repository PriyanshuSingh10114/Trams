import { createApp } from './app.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';

async function bootstrap() {
  const app = createApp();

  const server = app.listen(config.port, () => {
    logger.info(`API Gateway listening on port ${config.port}`, {
      env: config.env,
      service: config.serviceName,
      userServiceUrl: config.userServiceUrl,
      notificationServiceUrl: config.notificationServiceUrl,
      docsUrl: `http://localhost:${config.port}/api-docs`
    });
  });

  // Graceful shutdown
  let isShuttingDown = false;
  async function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`Received ${signal}. Starting graceful shutdown of API Gateway...`);

    server.close(() => {
      logger.info('API Gateway HTTP server closed cleanly. Exiting.');
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
  logger.error('Fatal bootstrap error in API Gateway', { error: error.message, stack: error.stack });
  process.exit(1);
});
