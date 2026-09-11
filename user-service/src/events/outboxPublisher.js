import { outboxRepository } from '../repositories/outboxRepository.js';
import { natsClient } from './natsClient.js';
import { logger } from '../utils/logger.js';

class OutboxPublisher {
  constructor() {
    this.intervalId = null;
    this.isProcessing = false;
  }

  async publishDirectly(outboxRecord) {
    try {
      if (!natsClient.isConnected) {
        logger.warn('NATS not connected. Event will be picked up by outbox poller once reconnected', {
          eventId: outboxRecord.eventId
        });
        return false;
      }

      const subject = outboxRecord.eventType;
      await natsClient.publish(subject, outboxRecord.payload);
      await outboxRepository.markAsPublished(outboxRecord.id);
      return true;
    } catch (error) {
      logger.error('Failed to directly publish outbox event', {
        outboxId: outboxRecord.id,
        eventId: outboxRecord.eventId,
        error: error.message
      });
      await outboxRepository.markAsFailed(outboxRecord.id, error.message);
      return false;
    }
  }

  async processPendingEvents() {
    if (this.isProcessing || !natsClient.isConnected) {
      return;
    }

    this.isProcessing = true;
    try {
      const pendingEvents = await outboxRepository.findPendingEvents(20);
      if (pendingEvents.length > 0) {
        logger.info(`Processing ${pendingEvents.length} pending outbox events`);
      }

      for (const event of pendingEvents) {
        try {
          const subject = event.eventType;
          await natsClient.publish(subject, event.payload);
          await outboxRepository.markAsPublished(event.id);
        } catch (err) {
          logger.error('Error processing outbox event in background worker', {
            outboxId: event.id,
            eventId: event.eventId,
            error: err.message
          });
          await outboxRepository.markAsFailed(event.id, err.message);
        }
      }
    } catch (error) {
      logger.error('Outbox publisher polling cycle failed', { error: error.message });
    } finally {
      this.isProcessing = false;
    }
  }

  start(intervalMs = 5000) {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.processPendingEvents(), intervalMs);
    logger.info('Outbox publisher background worker started', { intervalMs });
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Outbox publisher background worker stopped');
    }
  }
}

export const outboxPublisher = new OutboxPublisher();
