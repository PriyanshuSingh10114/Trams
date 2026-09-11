import { prisma } from './prisma.js';

export const deadLetterRepository = {
  async record(eventData, reason) {
    return prisma.deadLetterEvent.create({
      data: {
        eventId: eventData?.eventId || null,
        eventType: eventData?.eventType || null,
        payload: eventData || {},
        reason: reason || 'Unknown processing error'
      }
    });
  }
};
