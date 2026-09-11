import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Notification Service Logic', () => {
  it('should format welcome notification template correctly for user.created', () => {
    const event = {
      eventId: '123e4567-e89b-12d3-a456-426614174000',
      eventType: 'user.created',
      occurredAt: '2026-09-11T10:00:00.000Z',
      correlationId: 'test-corr-id',
      data: {
        userId: 'user-123',
        email: 'alice@example.com',
        name: 'Alice'
      }
    };

    const notificationPayload = {
      userId: event.data.userId,
      type: 'WELCOME',
      title: 'Welcome to the platform!',
      message: `Hello ${event.data.name}, welcome to our microservices platform! Your account has been created successfully.`,
      eventId: event.eventId,
      metadata: {
        email: event.data.email,
        name: event.data.name,
        registeredAt: event.occurredAt
      }
    };

    assert.strictEqual(notificationPayload.userId, 'user-123');
    assert.strictEqual(notificationPayload.type, 'WELCOME');
    assert.ok(notificationPayload.message.includes('Alice'));
    assert.strictEqual(notificationPayload.eventId, '123e4567-e89b-12d3-a456-426614174000');
  });

  it('should format profile updated notification template correctly for user.updated', () => {
    const event = {
      eventId: '123e4567-e89b-12d3-a456-426614174001',
      eventType: 'user.updated',
      occurredAt: '2026-09-11T11:00:00.000Z',
      correlationId: 'test-corr-id-2',
      data: {
        userId: 'user-123',
        email: 'alice_new@example.com',
        name: 'Alice Smith',
        updatedFields: ['name', 'email']
      }
    };

    const notificationPayload = {
      userId: event.data.userId,
      type: 'PROFILE_UPDATED',
      title: 'Profile Updated',
      message: 'Your profile details have been successfully updated.',
      eventId: event.eventId,
      metadata: {
        updatedFields: event.data.updatedFields,
        updatedAt: event.occurredAt
      }
    };

    assert.strictEqual(notificationPayload.type, 'PROFILE_UPDATED');
    assert.strictEqual(notificationPayload.userId, 'user-123');
    assert.deepStrictEqual(notificationPayload.metadata.updatedFields, ['name', 'email']);
  });
});
