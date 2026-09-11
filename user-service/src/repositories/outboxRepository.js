import { prisma } from './prisma.js';

export const outboxRepository = {
  async create(eventData, tx = prisma) {
    return tx.outboxEvent.create({
      data: {
        eventId: eventData.eventId,
        eventType: eventData.eventType,
        payload: eventData,
        status: 'PENDING'
      }
    });
  },

  async findPendingEvents(limit = 20, tx = prisma) {
    return tx.outboxEvent.findMany({
      where: {
        status: 'PENDING',
        retryCount: { lt: 5 }
      },
      orderBy: { createdAt: 'asc' },
      take: limit
    });
  },

  async markAsPublished(id, tx = prisma) {
    return tx.outboxEvent.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date()
      }
    });
  },

  async markAsFailed(id, errorMessage, tx = prisma) {
    return tx.outboxEvent.update({
      where: { id },
      data: {
        status: 'FAILED',
        errorMessage,
        retryCount: { increment: 1 }
      }
    });
  }
};
