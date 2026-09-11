import { describe, it } from 'node:test';
import assert from 'node:assert';
import { registerSchema, loginSchema, updateUserSchema } from '../../src/validators/userValidator.js';

describe('User Validation Schemas', () => {
  describe('registerSchema', () => {
    it('should validate valid registration input', () => {
      const valid = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123'
      };
      const result = registerSchema.safeParse(valid);
      assert.strictEqual(result.success, true);
    });

    it('should reject invalid email', () => {
      const invalid = {
        name: 'John Doe',
        email: 'not-an-email',
        password: 'Password123'
      };
      const result = registerSchema.safeParse(invalid);
      assert.strictEqual(result.success, false);
    });

    it('should reject weak password (less than 8 chars)', () => {
      const invalid = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Pass1'
      };
      const result = registerSchema.safeParse(invalid);
      assert.strictEqual(result.success, false);
    });

    it('should reject unknown extra properties due to strict mode', () => {
      const invalid = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123',
        isAdmin: true
      };
      const result = registerSchema.safeParse(invalid);
      assert.strictEqual(result.success, false);
    });
  });

  describe('loginSchema', () => {
    it('should validate valid login input', () => {
      const valid = {
        email: 'john@example.com',
        password: 'Password123'
      };
      const result = loginSchema.safeParse(valid);
      assert.strictEqual(result.success, true);
    });

    it('should reject missing password', () => {
      const invalid = {
        email: 'john@example.com'
      };
      const result = loginSchema.safeParse(invalid);
      assert.strictEqual(result.success, false);
    });
  });

  describe('updateUserSchema', () => {
    it('should allow updating only name', () => {
      const valid = { name: 'New Name' };
      const result = updateUserSchema.safeParse(valid);
      assert.strictEqual(result.success, true);
    });

    it('should reject empty update body', () => {
      const invalid = {};
      const result = updateUserSchema.safeParse(invalid);
      assert.strictEqual(result.success, false);
    });
  });
});
