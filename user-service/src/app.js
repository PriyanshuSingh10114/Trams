import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { correlationIdMiddleware } from './middleware/correlationId.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRoutes } from './routes/authRoutes.js';
import { userRoutes } from './routes/userRoutes.js';
import { healthRoutes } from './routes/healthRoutes.js';

export function createApp() {
  const app = express();

  // Basic security and parsing
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Correlation ID propagation
  app.use(correlationIdMiddleware);

  // Health and Readiness
  app.use('/', healthRoutes);

  // Service API routes
  app.use('/users', authRoutes);
  app.use('/users', userRoutes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.originalUrl} not found`,
        requestId: req.correlationId
      }
    });
  });

  // Centralized error handler
  app.use(errorHandler);

  return app;
}
