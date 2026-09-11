import dotenv from 'dotenv';
dotenv.config();

if (process.env.NODE_ENV === 'production') {
  if (!process.env.DATABASE_URL) {
    throw new Error('[Config Error] Missing required environment variable: DATABASE_URL');
  }
}

export const config = Object.freeze({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3002', 10),
  serviceName: process.env.SERVICE_NAME || 'notification-service',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres_notification_secret@localhost:5433/notification_service_db?schema=public',
  nats: {
    url: process.env.NATS_URL || 'nats://localhost:4222',
    user: process.env.NATS_USER || undefined,
    password: process.env.NATS_PASSWORD || undefined,
    stream: 'USER_EVENTS',
    consumerName: 'notification-service-durable',
    filterSubject: 'user.>'
  },
  internalApiKey: process.env.INTERNAL_API_KEY || 'internal-service-secret-key-replace-in-production'
});
