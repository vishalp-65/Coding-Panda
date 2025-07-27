import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { UserSession } from '../entities/UserSession';

export class UserSessionRepository {
  private repository: Repository<UserSession>;

  constructor() {
    this.repository = AppDataSource.getRepository(UserSession);
  }

  async create(sessionData: {
    userId: string;
    refreshTokenHash: string;
    sessionId: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<UserSession> {
    const session = this.repository.create(sessionData);
    return this.repository.save(session);
  }

  async findBySessionId(sessionId: string): Promise<UserSession | null> {
    return this.repository.findOne({
      where: { sessionId },
      relations: ['user'],
    });
  }

  async findByUserId(userId: string): Promise<UserSession[]> {
    return this.repository.find({
      where: { userId },
      order: { lastUsedAt: 'DESC' },
    });
  }

  async updateLastUsed(sessionId: string): Promise<void> {
    await this.repository.update({ sessionId }, { lastUsedAt: new Date() });
  }

  async delete(sessionId: string): Promise<boolean> {
    const result = await this.repository.delete({ sessionId });
    return result.affected !== 0;
  }

  async deleteByUserId(userId: string): Promise<number> {
    const result = await this.repository.delete({ userId });
    return result.affected || 0;
  }

  async deleteExpired(): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .where('expires_at < :now', { now: new Date() })
      .execute();

    return result.affected || 0;
  }

  async isValidSession(
    sessionId: string,
    refreshTokenHash: string
  ): Promise<boolean> {
    const session = await this.repository.findOne({
      where: {
        sessionId,
        refreshTokenHash,
      },
    });

    if (!session) return false;
    if (session.expiresAt < new Date()) {
      // Clean up expired session
      await this.delete(sessionId);
      return false;
    }

    return true;
  }
}
