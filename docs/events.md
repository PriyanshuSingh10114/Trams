# Event-Driven Architecture & Event Schemas

The system uses **NATS JetStream** for all asynchronous inter-service communication.

## JetStream Stream Configuration

- **Stream Name**: `USER_EVENTS`
- **Subjects**: `user.>` (`user.created`, `user.updated`)
- **Retention Policy**: `Limits` (7 days duration)
- **Storage**: `File` (Durable disk persistence)
- **Consumer Name**: `notification-service-durable`
- **Ack Policy**: `Explicit`
- **Max Deliveries**: `3`

---

## Standard Event Envelope

All events published across the system adhere to the following schema structure:

```json
{
  "eventId": "uuid (v4)",
  "eventType": "user.created | user.updated",
  "eventVersion": 1,
  "occurredAt": "2026-09-11T12:00:00.000Z",
  "source": "user-service",
  "correlationId": "uuid (v4)",
  "data": {
    ...
  }
}
```

> [!CAUTION]
> **Security Requirement**: Event payloads NEVER contain secrets, plaintext passwords, password hashes, or authentication tokens.

---

## Event Definitions

### 1. `user.created`
Published when a new user finishes registration in User Service.

```json
{
  "eventId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "eventType": "user.created",
  "eventVersion": 1,
  "occurredAt": "2026-09-11T12:00:00.000Z",
  "source": "user-service",
  "correlationId": "48f12a3d-cbb1-4c12-9c3f-cfae60f58fa9",
  "data": {
    "userId": "c62f28b4-8255-46eb-8e2b-f8976bcf6f99",
    "email": "jane@example.com",
    "name": "Jane Doe"
  }
}
```

#### Consumer Action (Notification Service)
1. Checks idempotency using `eventId`.
2. Generates a `WELCOME` notification for `userId`.
3. Inserts into `notifications` and `processed_events`.
4. Sends explicit `ACK` to JetStream.

---

### 2. `user.updated`
Published when a user updates their profile.

```json
{
  "eventId": "b3e042aa-5df9-4821-b3b3-85f269a84497",
  "eventType": "user.updated",
  "eventVersion": 1,
  "occurredAt": "2026-09-11T12:05:00.000Z",
  "source": "user-service",
  "correlationId": "48f12a3d-cbb1-4c12-9c3f-cfae60f58fa9",
  "data": {
    "userId": "c62f28b4-8255-46eb-8e2b-f8976bcf6f99",
    "email": "jane@example.com",
    "name": "Jane Updated",
    "updatedFields": ["name"]
  }
}
```

#### Consumer Action (Notification Service)
1. Checks idempotency using `eventId`.
2. Generates a `PROFILE_UPDATED` notification for `userId`.
3. Inserts into `notifications` and `processed_events`.
4. Sends explicit `ACK` to JetStream.
