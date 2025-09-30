import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('ab_test_configs')
export class ABTestConfig {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ unique: true })
    name!: string;

    @Column('text')
    description!: string;

    @Column('jsonb')
    variants!: Array<{
        id: string;
        name: string;
        allocation: number;
        config: Record<string, any>;
    }>;

    @Column('decimal', { precision: 5, scale: 2 })
    trafficAllocation!: number;

    @Column('timestamp')
    startDate!: Date;

    @Column('timestamp')
    endDate!: Date;

    @Column({
        type: 'enum',
        enum: ['draft', 'active', 'paused', 'completed'],
        default: 'draft'
    })
    status!: string;

    @Column()
    targetMetric!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}