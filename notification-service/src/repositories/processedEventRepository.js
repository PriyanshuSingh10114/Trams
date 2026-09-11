import { prisma } from './prisma.js';

export const processedEventRepository = {
  async exists(eventId, tx = prisma) {
    const record = await tx.processedEvent.findUnique({
      where: { eventId }
    });
    return !!record;
  },

  async record(data, tx = prisma) {
    return tx.processedEvent.create({
      data: {
        eventId: data.eventId,
        eventType: data.eventType,
        correlationId: data.correlationId || null,
        status: data.status || 'PROCESSED'
      }
    });
  }
};
