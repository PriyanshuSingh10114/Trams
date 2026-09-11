import { connect, JSONCodec, AckPolicy, DeliverPolicy } from 'nats';
import { config } from '../config/index.js';
import { notificationService } from '../services/notificationService.js';
import { deadLetterRepository } from '../repositories/deadLetterRepository.js';
import { logger } from '../utils/logger.js';

class UserEventsConsumer {
  constructor() {
    this.nc = null;
    this.js = null;
    this.jsm = null;
    this.jc = JSONCodec();
    this.isRunning = false;
    this.subscription = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      const options = {
        servers: config.nats.url,
        maxReconnectAttempts: -1,
        reconnectTimeWait: 2000,
        name: config.serviceName
      };

      if (config.nats.user && config.nats.password) {
        options.user = config.nats.user;
        options.pass = config.nats.password;
      }

      this.nc = await connect(options);
      this.isConnected = true;
      this.js = this.nc.jetstream();
      this.jsm = await this.nc.jetstreamManager();

      logger.info('Notification Service connected to NATS', { url: config.nats.url });

      // Start consuming messages
      await this.startConsumer();

      // Monitor connection status
      (async () => {
        for await (const status of this.nc.status()) {
          logger.info(`NATS connection status: ${status.type}`, { data: status.data });
        }
      })().catch(err => {
        logger.error('NATS status stream error', { error: err.message });
      });

      return this.nc;
    } catch (error) {
      this.isConnected = false;
      logger.error('Failed to connect to NATS in Notification Service', { error: error.message });
      throw error;
    }
  }

  async startConsumer() {
    try {
      // Ensure consumer exists on USER_EVENTS stream
      const consumerConfig = {
        durable_name: config.nats.consumerName,
        ack_policy: AckPolicy.Explicit,
        filter_subject: config.nats.filterSubject,
        deliver_policy: DeliverPolicy.All,
        max_deliver: 3,
        ack_wait: 5 * 1000 * 1000 * 1000 // 5 seconds in nanoseconds
      };

      try {
        await this.jsm.consumers.info(config.nats.stream, config.nats.consumerName);
        logger.info(`Durable consumer '${config.nats.consumerName}' exists`);
      } catch {
        // Stream might need to be created if notification service started before user service
        try {
          await this.jsm.streams.info(config.nats.stream);
        } catch {
          await this.jsm.streams.add({
            name: config.nats.stream,
            subjects: ['user.>']
          });
          logger.info(`Stream '${config.nats.stream}' initialized by Notification Service`);
        }

        await this.jsm.consumers.add(config.nats.stream, consumerConfig);
        logger.info(`Durable consumer '${config.nats.consumerName}' created`);
      }

      // Fetch messages using durable consumer
      const consumer = await this.js.consumers.get(config.nats.stream, config.nats.consumerName);
      this.subscription = await consumer.consume();
      this.isRunning = true;

      logger.info('JetStream consumer loop started, waiting for user events...');

      // Process messages asynchronously in background loop
      (async () => {
        for await (const msg of this.subscription) {
          if (!this.isRunning) break;
          await this.handleMessage(msg);
        }
      })().catch(err => {
        if (this.isRunning) {
          logger.error('Error in JetStream consumer consumption loop', { error: err.message });
        }
      });
    } catch (error) {
      logger.error('Failed to start durable consumer', { error: error.message });
      throw error;
    }
  }

  async handleMessage(msg) {
    let payload = null;
    const deliveryCount = msg.info?.deliveryCount || 1;

    try {
      payload = this.jc.decode(msg.data);
      logger.info(`Received event '${payload.eventType}'`, {
        eventId: payload.eventId,
        subject: msg.subject,
        deliveryCount,
        correlationId: payload.correlationId
      });

      // Process event idempotently
      await notificationService.processEvent(payload);

      // Explicit ACK after successful processing
      msg.ack();
      logger.info(`Message acknowledged successfully: ${payload.eventId}`, { eventId: payload.eventId });
    } catch (error) {
      logger.error('Failed to process message', {
        subject: msg.subject,
        deliveryCount,
        error: error.message,
        eventId: payload?.eventId
      });

      // If maximum delivery attempts reached, route to Dead Letter Queue and ACK
      if (deliveryCount >= 3) {
        logger.warn(`Max delivery count (${deliveryCount}) reached for event. Routing to DLQ.`, {
          eventId: payload?.eventId,
          subject: msg.subject
        });

        try {
          await deadLetterRepository.record(
            payload,
            `Max retries exceeded (${deliveryCount}): ${error.message}`
          );
        } catch (dlqErr) {
          logger.error('Failed to save to Dead Letter table', { error: dlqErr.message });
        }

        // ACK to avoid poison-pill blocking the stream
        msg.ack();
      } else {
        // Negative ACK with delayed backoff for redelivery
        msg.nak(1000);
      }
    }
  }

  async close() {
    this.isRunning = false;
    if (this.subscription) {
      try {
        await this.subscription.close();
      } catch (err) {
        logger.error('Error closing consumer subscription', { error: err.message });
      }
    }
    if (this.nc) {
      try {
        await this.nc.drain();
        await this.nc.close();
        this.isConnected = false;
        logger.info('NATS connection closed cleanly in Notification Service');
      } catch (err) {
        logger.error('Error closing NATS connection', { error: err.message });
      }
    }
  }
}

export const userEventsConsumer = new UserEventsConsumer();
