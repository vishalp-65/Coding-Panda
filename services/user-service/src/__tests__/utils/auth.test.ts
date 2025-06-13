import { AuthUtils } from '@ai-platform/common';

describe('AuthUtils', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'testpassword123';
      const hash = await AuthUtils.hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password and hash', async () => {
      const password = 'testpassword123';
      const hash = await AuthUtils.hashPassword(password);
      
      const isMatch = await AuthUtils.comparePassword(password, hash);
      expect(isMatch).toBe(true);
    });

    it('should return false for non-matching password and hash', async () => {
      const password = 'testpassword123';
      const wrongPassword = 'wrongpassword';
      const hash = await AuthUtils.hashPassword(password);
      
      const isMatch = await AuthUtils.comparePassword(wrongPassword, hash);
      expect(isMatch).toBe(false);
    });
  });

  describe('generateAccessToken', () => {
    it('should generate a valid JWT token', () => {
      const payload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        roles: ['user'],
        sessionId: 'test-session-id',
      };

      const token = AuthUtils.generateAccessToken(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const payload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        roles: ['user'],
        sessionId: 'test-session-id',
      };

      const token = AuthUtils.generateAccessToken(payload);
      const decoded = AuthUtils.verifyToken(token);
      
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.roles).toEqual(payload.roles);
      expect(decoded.sessionId).toBe(payload.sessionId);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';
      
      expect(() => {
        AuthUtils.verifyToken(invalidToken);
      }).toThrow();
    });
  });

  describe('generateSessionId', () => {
    it('should generate a unique session ID', () => {
      const sessionId1 = AuthUtils.generateSessionId();
      const sessionId2 = AuthUtils.generateSessionId();
      
      expect(sessionId1).toBeDefined();
      expect(sessionId2).toBeDefined();
      expect(sessionId1).not.toBe(sessionId2);
      expect(typeof sessionId1).toBe('string');
      expect(sessionId1.length).toBeGreaterThan(0);
    });
  });
});