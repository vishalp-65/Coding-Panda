import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('ab_test_assignments')
@Index(['userId', 'testId'], { unique: true })
export class ABTestAssignment {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('uuid')
    @Index()
    userId!: string;

    @Column('uuid')
    @Index()
    testId!: string;

    @Column('uuid')
    variantId!: string;

    @CreateDateColumn()
    assignedAt!: Date;
}