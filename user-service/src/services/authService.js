import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../repositories/prisma.js';
import { userRepository } from '../repositories/userRepository.js';
import { outboxRepository } from '../repositories/outboxRepository.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';
import { outboxPublisher } from '../events/outboxPublisher.js';
import { logger } from '../utils/logger.js';

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const authService = {
  async register({ name, email, password, correlationId }) {
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new AppError('A user with this email already exists', 409, 'USER_ALREADY_EXISTS');
    }

    const hashedPassword = await hashPassword(password);
    const eventId = uuidv4();
    const eventCorrelationId = correlationId || uuidv4();

    // Transactional write: User record + Outbox record atomically
    const { user, outboxRecord } = await prisma.$transaction(async (tx) => {
      const newUser = await userRepository.create({
        email: normalizedEmail,
        name: name.trim(),
        passwordHash: hashedPassword
      }, tx);

      const eventPayload = {
        eventId,
        eventType: 'user.created',
        eventVersion: 1,
        occurredAt: new Date().toISOString(),
        source: 'user-service',
        correlationId: eventCorrelationId,
        data: {
          userId: newUser.id,
          email: newUser.email,
          name: newUser.name
        }
      };

      const outbox = await outboxRepository.create({
        eventId,
        eventType: 'user.created',
        payload: eventPayload
      }, tx);

      return { user: newUser, outboxRecord: outbox };
    });

    // Attempt direct publishing asynchronously
    outboxPublisher.publishDirectly(outboxRecord).catch(err => {
      logger.error('Asynchronous outbox publish failed, queued for background worker', {
        eventId,
        error: err.message
      });
    });

    const token = generateToken(user);

    logger.info('User registered successfully', {
      userId: user.id,
      email: user.email,
      correlationId: eventCorrelationId
    });

    return { user, token };
  },

  async login({ email, password }) {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await userRepository.findByIdWithPassword(normalizedEmail);
    // Also try finding by email directly
    const userByEmail = await userRepository.findByEmail(normalizedEmail);
    if (!userByEmail) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const isPasswordValid = await comparePassword(password, userByEmail.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const sanitizedUser = {
      id: userByEmail.id,
      email: userByEmail.email,
      name: userByEmail.name,
      createdAt: userByEmail.createdAt,
      updatedAt: userByEmail.updatedAt
    };

    const token = generateToken(sanitizedUser);

    logger.info('User logged in successfully', {
      userId: sanitizedUser.id,
      email: sanitizedUser.email
    });

    return { user: sanitizedUser, token };
  }
};
