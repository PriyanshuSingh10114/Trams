import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateToken, verifyToken } from '../../src/utils/jwt.js';

describe('JWT Utility', () => {
  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com'
  };

  it('should generate a valid JWT token with user claims', () => {
    const token = generateToken(mockUser);
    assert.ok(typeof token === 'string');
    assert.ok(token.split('.').length === 3);

    const decoded = verifyToken(token);
    assert.ok(decoded);
    assert.strictEqual(decoded.sub, mockUser.id);
    assert.strictEqual(decoded.email, mockUser.email);
  });

  it('should return null for an invalid token', () => {
    const invalidToken = 'invalid.jwt.token';
    const decoded = verifyToken(invalidToken);
    assert.strictEqual(decoded, null);
  });
});
