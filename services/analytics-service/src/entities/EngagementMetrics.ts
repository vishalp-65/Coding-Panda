import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('engagement_metrics')
@Index(['userId', 'date'], { unique: true })
export class EngagementMetrics {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('uuid')
    @Index()
    userId!: string;

    @Column('date')
    @Index()
    date!: Date;

    @Column('jsonb')
    metrics!: {
        sessionCount: number;
        totalTime: number;
        problemsAttempted: number;
        problemsSolved: number;
        streakDays: number;
        lastActive: Date;
    };
}