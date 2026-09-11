# API Documentation & Reference

The system exposes public HTTP endpoints through the **API Gateway** running on port `3000`.

Interactive Swagger UI documentation is available at:
`http://localhost:3000/api-docs`

---

## Standard Response Envelopes

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_IDENTIFIER",
    "message": "Human readable error description",
    "details": [],
    "requestId": "d135439a-58ee-4ec5-b463-2a41764eb8ec"
  }
}
```

---

## Endpoints

### 1. Register User
- **Method**: `POST`
- **URL**: `/api/users/register`
- **Rate Limit**: 15 requests / 15 minutes
- **Request Body**:
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "StrongPassword123!"
}
```
- **Response** (`201 Created`):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "c62f28b4-8255-46eb-8e2b-f8976bcf6f99",
      "email": "jane@example.com",
      "name": "Jane Doe",
      "createdAt": "2026-09-11T12:00:00.000Z",
      "updatedAt": "2026-09-11T12:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 2. User Login
- **Method**: `POST`
- **URL**: `/api/users/login`
- **Rate Limit**: 15 requests / 15 minutes
- **Request Body**:
```json
{
  "email": "jane@example.com",
  "password": "StrongPassword123!"
}
```
- **Response** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "c62f28b4-8255-46eb-8e2b-f8976bcf6f99",
      "email": "jane@example.com",
      "name": "Jane Doe",
      "createdAt": "2026-09-11T12:00:00.000Z",
      "updatedAt": "2026-09-11T12:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 3. Get Authenticated User Profile
- **Method**: `GET`
- **URL**: `/api/users/me`
- **Headers**: `Authorization: Bearer <JWT>`
- **Response** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "id": "c62f28b4-8255-46eb-8e2b-f8976bcf6f99",
    "email": "jane@example.com",
    "name": "Jane Doe",
    "createdAt": "2026-09-11T12:00:00.000Z",
    "updatedAt": "2026-09-11T12:00:00.000Z"
  }
}
```

---

### 4. Update Profile
- **Method**: `PATCH`
- **URL**: `/api/users/me`
- **Headers**: `Authorization: Bearer <JWT>`
- **Request Body**:
```json
{
  "name": "Jane Updated"
}
```
- **Response** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "id": "c62f28b4-8255-46eb-8e2b-f8976bcf6f99",
    "email": "jane@example.com",
    "name": "Jane Updated",
    "createdAt": "2026-09-11T12:00:00.000Z",
    "updatedAt": "2026-09-11T12:05:00.000Z"
  }
}
```

---

### 5. Get User Notifications
- **Method**: `GET`
- **URL**: `/api/notifications`
- **Headers**: `Authorization: Bearer <JWT>`
- **Response** (`200 OK`):
```json
{
  "success": true,
  "data": [
    {
      "id": "0d6118b4-5231-4e78-957f-1d88929e71cc",
      "userId": "c62f28b4-8255-46eb-8e2b-f8976bcf6f99",
      "type": "WELCOME",
      "title": "Welcome to the platform!",
      "message": "Hello Jane Doe, welcome to our microservices platform! Your account has been created successfully.",
      "status": "DELIVERED",
      "eventId": "f295b3f1-d003-4f9e-a0e2-9b2ee32df9e1",
      "createdAt": "2026-09-11T12:00:01.000Z",
      "processedAt": "2026-09-11T12:00:01.000Z"
    }
  ]
}
```

---

### 6. System Health & Readiness
- `GET /health` — Liveness verification
- `GET /ready` — Readiness checking upstream dependencies and databases
