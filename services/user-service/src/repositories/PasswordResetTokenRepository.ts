import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { PasswordResetToken } from '../entities/PasswordResetToken';

export class PasswordResetTokenRepository {
  private repository: Repository<PasswordResetToken>;

  constructor() {
    this.repository = AppDataSource.getRepository(PasswordResetToken);
  }

  async create(tokenData: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<PasswordResetToken> {
    const token = this.repository.create(tokenData);
    return this.repository.save(token);
  }

  async findValidToken(tokenHash: string): Promise<PasswordResetToken | null> {
    return this.repository.findOne({
      where: {
        tokenHash,
        used: false,
      },
      relations: ['user'],
    });
  }

  async markAsUsed(id: string): Promise<void> {
    await this.repository.update(id, { used: true });
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

  async isValidToken(tokenHash: string): Promise<boolean> {
    const token = await this.repository.findOne({
      where: {
        tokenHash,
        used: false,
      },
    });

    if (!token) return false;
    if (token.expiresAt < new Date()) {
      return false;
    }

    return true;
  }
}