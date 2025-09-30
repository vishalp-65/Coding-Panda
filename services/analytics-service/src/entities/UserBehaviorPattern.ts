import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, Index } from 'typeorm';

@Entity('user_behavior_patterns')
export class UserBehaviorPattern {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('uuid', { unique: true })
    @Index()
    userId!: string;

    @Column('jsonb')
    patterns!: {
        sessionDuration: number;
        problemsSolved: number;
        preferredDifficulty: string;
        activeHours: number[];
        streakDays: number;
        dropoffPoints: string[];
    };

    @UpdateDateColumn()
    lastUpdated!: Date;
}