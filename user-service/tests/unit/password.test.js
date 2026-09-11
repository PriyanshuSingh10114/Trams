import { describe, it } from 'node:test';
import assert from 'node:assert';
import { hashPassword, comparePassword } from '../../src/utils/password.js';

describe('Password Utility', () => {
  it('should hash a password correctly and not equal plain password', async () => {
    const plain = 'StrongP@ssw0rd123';
    const hash = await hashPassword(plain);

    assert.notStrictEqual(hash, plain);
    assert.ok(hash.startsWith('$2a$') || hash.startsWith('$2b$'));
  });

  it('should verify matching password correctly', async () => {
    const plain = 'MySecret123!';
    const hash = await hashPassword(plain);

    const isMatch = await comparePassword(plain, hash);
    assert.strictEqual(isMatch, true);
  });

  it('should reject non-matching password', async () => {
    const plain = 'MySecret123!';
    const wrong = 'WrongPassword123!';
    const hash = await hashPassword(plain);

    const isMatch = await comparePassword(wrong, hash);
    assert.strictEqual(isMatch, false);
  });
});
