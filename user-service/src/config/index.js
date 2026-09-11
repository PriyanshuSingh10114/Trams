import dotenv from 'dotenv';
dotenv.config();

const requiredEnvVars = [];

if (process.env.NODE_ENV === 'production') {
  if (!process.env.DATABASE_URL) {
    throw new Error('[Config Error] Missing required environment variable: DATABASE_URL');
  }
  if (!process.env.JWT_SECRET) {
    throw new Error('[Config Error] Missing required environment variable: JWT_SECRET');
  }
}

export const config = Object.freeze({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  serviceName: process.env.SERVICE_NAME || 'user-service',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres_user_secret@localhost:5432/user_service_db?schema=public',
  nats: {
    url: process.env.NATS_URL || 'nats://localhost:4222',
    user: process.env.NATS_USER || undefined,
    password: process.env.NATS_PASSWORD || undefined,
    stream: 'USER_EVENTS',
    subjects: ['user.created', 'user.updated']
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-key-at-least-32-characters-long',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  internalApiKey: process.env.INTERNAL_API_KEY || 'internal-service-secret-key-replace-in-production'
});
