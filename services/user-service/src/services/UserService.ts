import { UserRepository } from '../repositories';
import { User } from '../entities/User';
import { PaginationOptions, PaginatedResult } from '@ai-platform/common';
import { UserProfile, UserPreferences } from '@ai-platform/types';

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async getUserById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async getUserByUsername(username: string): Promise<User | null> {
    return this.userRepository.findByUsername(username);
  }

  async getAllUsers(
    options: PaginationOptions
  ): Promise<PaginatedResult<User>> {
    return this.userRepository.findAll(options);
  }

  async updateProfile(
    userId: string,
    profileData: Partial<UserProfile>
  ): Promise<User | null> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return this.userRepository.updateProfile(userId, profileData);
  }

  async updatePreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): Promise<User | null> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return this.userRepository.updatePreferences(userId, preferences);
  }

  async deleteUser(userId: string): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return this.userRepository.delete(userId);
  }

  async checkEmailAvailability(email: string): Promise<boolean> {
    return !(await this.userRepository.existsByEmail(email));
  }

  async checkUsernameAvailability(username: string): Promise<boolean> {
    return !(await this.userRepository.existsByUsername(username));
  }

  async updateUserRoles(userId: string, roles: string[]): Promise<User | null> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return this.userRepository.update(userId, { roles: roles as any });
  }

  async getUserSessions(userId: string) {
    // This would typically be handled by the session repository
    // but we can add it here for completeness
    return [];
  }
}
