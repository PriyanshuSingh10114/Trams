# Distributed Microservices Architecture

## Overview

This distributed system is built following production microservice principles and an **Event-Driven Architecture (EDA)**. The system isolates business domains into independent services with their own data stores and enforces strict asynchronous communication boundaries via **NATS JetStream**.

---

## Architectural Diagram

```text
                                CLIENT
                                  │
                                  │ HTTP / JSON
                                  ▼
                    ┌───────────────────────────┐
                    │        API GATEWAY        │
                    │      (Port 3000 /api)     │
                    │───────────────────────────│
                    │ • Correlation ID Injector │
                    │ • Rate Limiting & Helmet  │
                    │ • JWT Auth Verification   │
                    │ • Reverse Proxy Routing   │
                    │ • Swagger / OpenAPI Docs  │
                    └─────────────┬─────────────┘
                                  │
                   HTTP Forward   │   HTTP Forward (Internal Query)
             ┌────────────────────┴────────────────────┐
             ▼                                         ▼
   ┌───────────────────┐                     ┌───────────────────┐
   │   USER SERVICE    │                     │   NOTIFICATION    │
   │    (Port 3001)    │                     │      SERVICE      │
   │───────────────────│                     │    (Port 3002)    │
   │ • Auth & Profiles │                     │───────────────────│
   │ • Zod Validation  │                     │ • Durable Consumer│
   │ • Transactional   │                     │   (NATS JetStream)│
   │   Outbox Pattern  │                     │ • Idempotent Proc │
   │ • PostgreSQL DB   │                     │ • Retries & DLQ   │
   │ • Health/Ready    │                     │ • Notification DB │
   └─────────┬─────────┘                     └─────────▲─────────┘
             │                                         │
             ▼                                         │
     ┌───────────────┐                        NATS JetStream
     │    USER DB    │                     (Stream: USER_EVENTS)
     │ (PostgreSQL)  │                     (Subject: user.*)
     └───────────────┘                                 │
             │                                         │
             └─────────── Outbox Publisher ────────────┘
                         (user.created / user.updated)
```

---

## Inter-Service Communication Model

### Strict Asynchronous Boundary
* **Rule**: The User Service **never** communicates with the Notification Service over REST, WebSockets, or shared databases.
* **Mechanism**: Every domain state change in User Service generates an immutable event (`user.created`, `user.updated`) published to the **NATS JetStream** stream `USER_EVENTS`.
* **Consumer**: The Notification Service attaches a durable push/pull consumer with explicit acknowledgments (`AckPolicy.Explicit`).

---

## Transactional Outbox Pattern

To eliminate the classic **Dual-Write Problem** (where a database write succeeds but message broker publish fails), the User Service implements the **Transactional Outbox Pattern**:

```text
[User Service Registration / Update Flow]

   1. Begin Database Transaction
         ├── Insert/Update User Record in `users`
         └── Insert Event Record in `outbox_events` (status: 'PENDING')
   2. Commit Transaction (Guaranteed Atomic)
   3. Asynchronous Publish to NATS JetStream
         ├── Success: Mark `outbox_events` as 'PUBLISHED'
         └── Failure: Left as 'PENDING', picked up by Outbox Recovery Worker
```

### Outbox Recovery Worker
A background worker continuously scans for any `PENDING` outbox records older than a threshold and flushes them to JetStream, ensuring **at-least-once delivery** even during sudden network or broker restarts.

---

## Idempotency & Message Deduplication

Distributed message systems guarantee **at-least-once delivery**, which means duplicate messages can occur due to network retransmits or consumer restarts.

The Notification Service handles duplicates with **Idempotency**:
1. Every event carries a globally unique `eventId` (UUIDv4).
2. The Notification Service checks if `eventId` exists in the `processed_events` table before processing.
3. If `eventId` exists:
   - Event processing is skipped.
   - The message is immediately **ACKed** in NATS.
   - Logged as duplicate skipped.
4. If `eventId` is new:
   - In a single database transaction, the event is saved to `processed_events` and the corresponding record in `notifications` is created.
   - The message is **ACKed**.

---

## Retry Handling & Dead Letter Queue (DLQ)

```text
Message Arrives
     │
     ├── Parse & Process Event
     │      │
     │      ├── Success ──────────────────────────► Explicit ACK
     │      │
     │      └── Failure
     │             │
     │             ├── Delivery Count < 3 ────────► NAK with Backoff (Redelivery)
     │             │
     │             └── Delivery Count >= 3 ───────► Store in Dead Letter DB (DLQ)
     │                                                     │
     │                                                     └── Explicit ACK (Unblock stream)
```

- Max deliveries configured: **3 attempts**.
- Poison-pill messages are safely quarantined in the `dead_letter_events` table for investigation without blocking subsequent stream messages.

---

## Database Per Service

* **User DB**: PostgreSQL on port 5432 (`user_service_db`), managed via User Service Prisma schema (`users`, `outbox_events`).
* **Notification DB**: PostgreSQL on port 5433 (`notification_service_db`), managed via Notification Service Prisma schema (`notifications`, `processed_events`, `dead_letter_events`).
* **Zero shared state**: Neither service has access or credentials to the other's database.
