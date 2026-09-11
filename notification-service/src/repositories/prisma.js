import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' }
  ]
});

prisma.$on('error', (e) => {
  logger.error('Prisma Database Error in Notification Service', { error: e.message });
});

prisma.$on('warn', (e) => {
  logger.warn('Prisma Database Warning in Notification Service', { warning: e.message });
});
