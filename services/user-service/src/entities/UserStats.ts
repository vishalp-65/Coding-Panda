import {
  Entity,
  PrimaryColumn,
  Column,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './User';

@Entity('user_stats')
export class UserStats {
  @PrimaryColumn({ name: 'user_id' })
  userId!: string;

  @Column({ name: 'total_submissions', default: 0 })
  totalSubmissions!: number;

  @Column({ name: 'accepted_submissions', default: 0 })
  acceptedSubmissions!: number;

  @Column({ name: 'acceptance_rate', type: 'decimal', precision: 5, scale: 2, default: 0.00 })
  acceptanceRate!: number;

  @Column({ name: 'problems_solved', default: 0 })
  problemsSolved!: number;

  @Column({ name: 'contests_participated', default: 0 })
  contestsParticipated!: number;

  @Column({ default: 0 })
  ranking!: number;

  @Column({ default: 0 })
  streak!: number;

  @Column({ name: 'longest_streak', default: 0 })
  longestStreak!: number;

  @Column({ name: 'skill_ratings', type: 'jsonb', default: {} })
  skillRatings!: Record<string, number>;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToOne(() => User, (user) => user.stats, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}