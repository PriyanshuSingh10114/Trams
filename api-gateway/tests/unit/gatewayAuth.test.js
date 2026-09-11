import { describe, it } from 'node:test';
import assert from 'node:assert';
import jwt from 'jsonwebtoken';

describe('API Gateway Auth Middleware Logic', () => {
  const secret = 'test-secret-at-least-32-chars-long-for-testing';

  it('should verify and decode valid JWT payload', () => {
    const payload = {
      sub: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com'
    };

    const token = jwt.sign(payload, secret, { expiresIn: '1h' });
    const decoded = jwt.verify(token, secret);

    assert.strictEqual(decoded.sub, payload.sub);
    assert.strictEqual(decoded.email, payload.email);
  });

  it('should fail verification for tampered token', () => {
    const payload = { sub: 'user-1' };
    const token = jwt.sign(payload, secret);
    const tampered = token.slice(0, -5) + 'abcde';

    assert.throws(() => {
      jwt.verify(tampered, secret);
    });
  });

  it('should fail verification for expired token', () => {
    const payload = { sub: 'user-1' };
    const token = jwt.sign(payload, secret, { expiresIn: -1 });

    assert.throws(() => {
      jwt.verify(token, secret);
    });
  });
});
