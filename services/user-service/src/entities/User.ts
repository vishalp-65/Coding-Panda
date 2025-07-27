import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { UserProfile, UserPreferences, UserRole } from '@ai-platform/types';
import { UserSession } from './UserSession';
import { PasswordResetToken } from './PasswordResetToken';
import { EmailVerificationToken } from './EmailVerificationToken';
import { UserStats } from './UserStats';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true, length: 255 })
  email!: string;

  @Column({ unique: true, length: 50 })
  username!: string;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash!: string;

  @Column({ type: 'jsonb', default: {} })
  profile!: UserProfile;

  @Column({ type: 'jsonb', default: {} })
  preferences!: UserPreferences;

  @Column({ type: 'text', array: true, default: ['user'] })
  roles!: UserRole[];

  @Column({ name: 'is_email_verified', default: false })
  isEmailVerified!: boolean;

  @Column({ name: 'two_factor_enabled', default: false })
  twoFactorEnabled!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => UserSession, session => session.user)
  sessions!: UserSession[];

  @OneToMany(() => PasswordResetToken, token => token.user)
  passwordResetTokens!: PasswordResetToken[];

  @OneToMany(() => EmailVerificationToken, token => token.user)
  emailVerificationTokens!: EmailVerificationToken[];

  @OneToOne(() => UserStats, stats => stats.user)
  stats!: UserStats;

  // Helper method to get user without sensitive data
  toSafeObject() {
    const { passwordHash, ...safeUser } = this;
    return safeUser;
  }
}
