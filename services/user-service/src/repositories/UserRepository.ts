import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { UserStats } from '../entities/UserStats';
import { CreateUserRequest } from '@ai-platform/types';
import { PaginationOptions, PaginatedResult, DatabaseUtils } from '@ai-platform/common';

export class UserRepository {
  private repository: Repository<User>;
  private statsRepository: Repository<UserStats>;

  constructor() {
    this.repository = AppDataSource.getRepository(User);
    this.statsRepository = AppDataSource.getRepository(UserStats);
  }

  async create(userData: CreateUserRequest & { passwordHash: string }): Promise<User> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create user
      const user = this.repository.create({
        email: userData.email,
        username: userData.username,
        passwordHash: userData.passwordHash,
        profile: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          skillLevel: 'beginner',
          programmingLanguages: [],
        },
        preferences: {
          theme: 'system',
          language: 'en',
          timezone: 'UTC',
          emailNotifications: {
            contestReminders: true,
            newProblems: true,
            achievementUnlocked: true,
            weeklyDigest: true,
            socialActivity: false,
          },
          privacySettings: {
            profileVisibility: 'public',
            showEmail: false,
            showRealName: false,
            showLocation: false,
            allowDirectMessages: true,
          },
        },
      });

      const savedUser = await queryRunner.manager.save(user);

      // Create user stats
      const userStats = this.statsRepository.create({
        userId: savedUser.id,
      });
      await queryRunner.manager.save(userStats);

      await queryRunner.commitTransaction();
      return savedUser;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findById(id: string): Promise<User | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['stats'],
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({
      where: { email },
      relations: ['stats'],
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.repository.findOne({
      where: { username },
      relations: ['stats'],
    });
  }

  async findByEmailOrUsername(emailOrUsername: string): Promise<User | null> {
    return this.repository.findOne({
      where: [
        { email: emailOrUsername },
        { username: emailOrUsername },
      ],
      relations: ['stats'],
    });
  }

  async update(id: string, updates: Partial<User>): Promise<User | null> {
    await this.repository.update(id, updates);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected !== 0;
  }

  async findAll(options: PaginationOptions): Promise<PaginatedResult<User>> {
    const offset = DatabaseUtils.calculateOffset(options.page, options.limit);
    
    const [users, total] = await this.repository.findAndCount({
      relations: ['stats'],
      skip: offset,
      take: options.limit,
      order: { createdAt: 'DESC' },
    });

    return DatabaseUtils.createPaginatedResult(users, total, options.page, options.limit);
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.repository.count({ where: { email } });
    return count > 0;
  }

  async existsByUsername(username: string): Promise<boolean> {
    const count = await this.repository.count({ where: { username } });
    return count > 0;
  }

  async verifyEmail(id: string): Promise<void> {
    await this.repository.update(id, { isEmailVerified: true });
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.repository.update(id, { passwordHash });
  }

  async updateProfile(id: string, profile: Partial<User['profile']>): Promise<User | null> {
    const user = await this.findById(id);
    if (!user) return null;

    const updatedProfile = { ...user.profile, ...profile };
    await this.repository.update(id, { profile: updatedProfile });
    return this.findById(id);
  }

  async updatePreferences(id: string, preferences: Partial<User['preferences']>): Promise<User | null> {
    const user = await this.findById(id);
    if (!user) return null;

    const updatedPreferences = { ...user.preferences, ...preferences };
    await this.repository.update(id, { preferences: updatedPreferences });
    return this.findById(id);
  }
}