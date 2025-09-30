import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('analytics_events')
@Index(['userId', 'timestamp'])
@Index(['eventType', 'timestamp'])
export class AnalyticsEvent {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('uuid')
    @Index()
    userId!: string;

    @Column({ length: 100 })
    @Index()
    eventType!: string;

    @Column('jsonb')
    eventData!: Record<string, any>;

    @CreateDateColumn()
    @Index()
    timestamp!: Date;

    @Column({ nullable: true })
    sessionId?: string;

    @Column({ nullable: true })
    userAgent?: string;

    @Column({ nullable: true })
    ipAddress?: string;
}