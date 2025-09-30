import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('performance_metrics')
@Index(['userId', 'timestamp'])
@Index(['problemId', 'timestamp'])
export class PerformanceMetrics {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('uuid')
    @Index()
    userId!: string;

    @Column()
    @Index()
    problemId!: string;

    @Column('jsonb')
    metrics!: {
        solutionTime: number;
        attempts: number;
        hintsUsed: number;
        codeQuality: number;
        efficiency: number;
    };

    @CreateDateColumn()
    @Index()
    timestamp!: Date;
}