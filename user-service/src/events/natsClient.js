import { connect, JSONCodec, RetentionPolicy, StorageType } from 'nats';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

class NatsClient {
  constructor() {
    this.nc = null;
    this.js = null;
    this.jsm = null;
    this.jc = JSONCodec();
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

      logger.info('Connected to NATS Server', { url: config.nats.url });

      // Initialize JetStream Stream
      await this.initStream();

      // Monitor connection status
      (async () => {
        for await (const status of this.nc.status()) {
          logger.info(`NATS connection status changed: ${status.type}`, { data: status.data });
        }
      })().catch(err => {
        logger.error('NATS status stream error', { error: err.message });
      });

      return this.nc;
    } catch (error) {
      this.isConnected = false;
      logger.error('Failed to connect to NATS', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  async initStream() {
    try {
      const streamConfig = {
        name: config.nats.stream,
        subjects: ['user.>'],
        retention: RetentionPolicy.Limits,
        storage: StorageType.File,
        max_age: 7 * 24 * 60 * 60 * 1000 * 1000 * 1000, // 7 days in nanoseconds
        num_replicas: 1
      };

      try {
        await this.jsm.streams.info(config.nats.stream);
        logger.info(`JetStream stream '${config.nats.stream}' already exists`);
      } catch {
        await this.jsm.streams.add(streamConfig);
        logger.info(`JetStream stream '${config.nats.stream}' created successfully`);
      }
    } catch (error) {
      logger.error('Error initializing JetStream stream', { error: error.message });
      throw error;
    }
  }

  async publish(subject, data) {
    if (!this.isConnected || !this.js) {
      throw new Error('NATS JetStream client is not connected');
    }

    try {
      const payload = this.jc.encode(data);
      const pubAck = await this.js.publish(subject, payload);
      logger.info(`Published event to ${subject}`, {
        subject,
        stream: pubAck.stream,
        seq: pubAck.seq,
        eventId: data.eventId,
        correlationId: data.correlationId
      });
      return pubAck;
    } catch (error) {
      logger.error(`Failed to publish event to ${subject}`, {
        subject,
        eventId: data?.eventId,
        error: error.message
      });
      throw error;
    }
  }

  async close() {
    if (this.nc) {
      try {
        await this.nc.drain();
        await this.nc.close();
        this.isConnected = false;
        logger.info('NATS connection cleanly closed');
      } catch (error) {
        logger.error('Error closing NATS connection', { error: error.message });
      }
    }
  }
}

export const natsClient = new NatsClient();
