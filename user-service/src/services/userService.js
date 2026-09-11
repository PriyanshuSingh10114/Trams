import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../repositories/prisma.js';
import { userRepository } from '../repositories/userRepository.js';
import { outboxRepository } from '../repositories/outboxRepository.js';
import { outboxPublisher } from '../events/outboxPublisher.js';
import { AppError } from './authService.js';
import { logger } from '../utils/logger.js';

export const userService = {
  async getUserById(id) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    return user;
  },

  async updateUserProfile(id, updateData, correlationId) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // If changing email, check uniqueness
    if (updateData.email && updateData.email.toLowerCase() !== user.email) {
      const existing = await userRepository.findByEmail(updateData.email.toLowerCase());
      if (existing && existing.id !== id) {
        throw new AppError('Email is already taken by another account', 409, 'EMAIL_ALREADY_EXISTS');
      }
    }

    const eventId = uuidv4();
    const eventCorrelationId = correlationId || uuidv4();

    // Transactional write
    const { updatedUser, outboxRecord } = await prisma.$transaction(async (tx) => {
      const updated = await userRepository.update(id, updateData, tx);

      const eventPayload = {
        eventId,
        eventType: 'user.updated',
        eventVersion: 1,
        occurredAt: new Date().toISOString(),
        source: 'user-service',
        correlationId: eventCorrelationId,
        data: {
          userId: updated.id,
          email: updated.email,
          name: updated.name,
          updatedFields: Object.keys(updateData)
        }
      };

      const outbox = await outboxRepository.create({
        eventId,
        eventType: 'user.updated',
        payload: eventPayload
      }, tx);

      return { updatedUser: updated, outboxRecord: outbox };
    });

    outboxPublisher.publishDirectly(outboxRecord).catch(err => {
      logger.error('Asynchronous outbox publish for update failed', {
        eventId,
        error: err.message
      });
    });

    logger.info('User profile updated successfully', {
      userId: updatedUser.id,
      correlationId: eventCorrelationId
    });

    return updatedUser;
  }
};
