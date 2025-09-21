import Joi from 'joi';
import { commonSchemas } from '@ai-platform/common';

describe('Validation Schemas', () => {
  describe('email validation', () => {
    it('should validate correct email format', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
      ];

      validEmails.forEach(email => {
        const { error } = commonSchemas.email.validate(email);
        expect(error).toBeUndefined();
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test.example.com',
      ];

      invalidEmails.forEach(email => {
        const { error } = commonSchemas.email.validate(email);
        expect(error).toBeDefined();
      });
    });
  });

  describe('password validation', () => {
    it('should validate strong passwords', () => {
      const validPasswords = ['Password123!', 'MyStr0ng@Pass', 'C0mplex#Pass1'];

      validPasswords.forEach(password => {
        const { error } = commonSchemas.password.validate(password);
        expect(error).toBeUndefined();
      });
    });

    it('should reject weak passwords', () => {
      const invalidPasswords = [
        'weak',
        'password',
        '12345678',
        'PASSWORD',
        'password123',
        'Password123', // missing special character
      ];

      invalidPasswords.forEach(password => {
        const { error } = commonSchemas.password.validate(password);
        expect(error).toBeDefined();
      });
    });
  });

  describe('uuid validation', () => {
    it('should validate correct UUID format', () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      ];

      validUUIDs.forEach(uuid => {
        const { error } = commonSchemas.uuid.validate(uuid);
        expect(error).toBeUndefined();
      });
    });

    it('should reject invalid UUID formats', () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '123-456-789',
        '123e4567-e89b-12d3-a456',
      ];

      invalidUUIDs.forEach(uuid => {
        const { error } = commonSchemas.uuid.validate(uuid);
        expect(error).toBeDefined();
      });
    });
  });

  describe('pagination validation', () => {
    it('should validate correct pagination parameters', () => {
      const validPagination = [
        { page: 1, limit: 10 },
        { page: 5, limit: 50 },
        { page: 1, limit: 1 },
      ];

      validPagination.forEach(pagination => {
        const { error } = commonSchemas.pagination.validate(pagination);
        expect(error).toBeUndefined();
      });
    });

    it('should apply default values', () => {
      const { value } = commonSchemas.pagination.validate({});
      expect(value.page).toBe(1);
      expect(value.limit).toBe(20);
    });

    it('should reject invalid pagination parameters', () => {
      const invalidPagination = [
        { page: 0, limit: 10 },
        { page: 1, limit: 0 },
        { page: -1, limit: 10 },
        { page: 1, limit: 101 },
      ];

      invalidPagination.forEach(pagination => {
        const { error } = commonSchemas.pagination.validate(pagination);
        expect(error).toBeDefined();
      });
    });
  });
});
