import { prisma } from './prisma.js';

export const notificationRepository = {
  async create(data, tx = prisma) {
    return tx.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        status: data.status || 'DELIVERED',
        eventId: data.eventId,
        metadata: data.metadata || {}
      }
    });
  },

  async findByUserId(userId, limit = 50) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  },

  async findById(id) {
    return prisma.notification.findUnique({
      where: { id }
    });
  },

  async findByEventId(eventId, tx = prisma) {
    return tx.notification.findUnique({
      where: { eventId }
    });
  }
};
