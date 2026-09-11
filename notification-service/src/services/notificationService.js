import { prisma } from '../repositories/prisma.js';
import { notificationRepository } from '../repositories/notificationRepository.js';
import { processedEventRepository } from '../repositories/processedEventRepository.js';
import { logger } from '../utils/logger.js';

export const notificationService = {
  async processEvent(event) {
    const rawEvent = event.payload || event;
    const eventId = rawEvent.eventId || event.eventId;
    const eventType = rawEvent.eventType || event.eventType;
    const correlationId = rawEvent.correlationId || event.correlationId;
    const data = rawEvent.data || rawEvent;

    if (!eventId || !eventType) {
      throw new Error('Malformed event: eventId and eventType are required');
    }

    // Idempotency Check: check if event was already processed
    const alreadyProcessed = await processedEventRepository.exists(eventId);
    if (alreadyProcessed) {
      logger.info('Duplicate event detected and skipped (idempotent)', {
        eventId,
        eventType,
        correlationId
      });
      return { status: 'SKIPPED', reason: 'DUPLICATE_EVENT', eventId };
    }

    // Generate Notification content based on Event Type
    let notificationPayload = null;

    if (eventType === 'user.created') {
      const name = data?.name || 'there';
      notificationPayload = {
        userId: data.userId,
        type: 'WELCOME',
        title: 'Welcome to the platform!',
        message: `Hello ${name}, welcome to our microservices platform! Your account has been created successfully.`,
        eventId,
        metadata: {
          email: data.email,
          name: data.name,
          registeredAt: event.occurredAt
        }
      };
    } else if (eventType === 'user.updated') {
      notificationPayload = {
        userId: data.userId,
        type: 'PROFILE_UPDATED',
        title: 'Profile Updated',
        message: 'Your profile details have been successfully updated.',
        eventId,
        metadata: {
          updatedFields: data.updatedFields,
          updatedAt: event.occurredAt
        }
      };
    } else {
      logger.warn(`Unrecognized event type: ${eventType}. Ignoring.`, { eventId, correlationId });
      // Record as processed to avoid re-evaluating unknown types
      await processedEventRepository.record({
        eventId,
        eventType,
        correlationId,
        status: 'IGNORED_UNKNOWN_TYPE'
      });
      return { status: 'IGNORED', reason: 'UNKNOWN_EVENT_TYPE', eventId };
    }

    // Transactional creation: ProcessedEvent record + Notification record
    const result = await prisma.$transaction(async (tx) => {
      await processedEventRepository.record({
        eventId,
        eventType,
        correlationId,
        status: 'PROCESSED'
      }, tx);

      const notification = await notificationRepository.create(notificationPayload, tx);
      return notification;
    });

    logger.info('Notification created successfully from event', {
      notificationId: result.id,
      userId: result.userId,
      type: result.type,
      eventId,
      correlationId
    });

    return { status: 'PROCESSED', notification: result };
  },

  async getNotificationsByUserId(userId) {
    return notificationRepository.findByUserId(userId);
  },

  async getNotificationById(id) {
    return notificationRepository.findById(id);
  }
};
