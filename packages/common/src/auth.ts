import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

export interface JWTPayload {
  userId: string;
  email: string;
  roles: string[];
  sessionId: string;
}

export class AuthUtils {
  private static readonly SALT_ROUNDS = 12;
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
  private static readonly REFRESH_TOKEN_EXPIRES_IN =
    process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  static async comparePassword(
    password: string,
    hash: string
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateAccessToken(payload: JWTPayload): string {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
      issuer: 'ai-platform',
      audience: 'ai-platform-users',
    } as SignOptions);
  }

  static generateRefreshToken(payload: Omit<JWTPayload, 'sessionId'>): string {
    const sessionId = uuidv4();
    return jwt.sign({ ...payload, sessionId }, this.JWT_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
      issuer: 'ai-platform',
      audience: 'ai-platform-users',
    } as SignOptions);
  }

  static verifyToken(token: string): JWTPayload {
    return jwt.verify(token, this.JWT_SECRET, {
      issuer: 'ai-platform',
      audience: 'ai-platform-users',
    }) as JWTPayload;
  }

  static generateSessionId(): string {
    return uuidv4();
  }
}
