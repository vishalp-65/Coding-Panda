import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from './User';

export enum DeletionStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
    CANCELLED = 'cancelled',
}

export enum DeletionType {
    FULL_ACCOUNT = 'full_account',
    PARTIAL_DATA = 'partial_data',
    ANONYMIZATION = 'anonymization',
}

@Entity('data_deletion_requests')
export class DataDeletionRequest {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'user_id' })
    userId!: string;

    @Column({
        type: 'enum',
        enum: DeletionStatus,
        default: DeletionStatus.PENDING,
    })
    status!: DeletionStatus;

    @Column({
        type: 'enum',
        enum: DeletionType,
        default: DeletionType.FULL_ACCOUNT,
    })
    deletionType!: DeletionType;

    @Column({ name: 'data_types', type: 'text', array: true, nullable: true })
    dataTypes?: string[];

    @Column({ name: 'reason', type: 'text', nullable: true })
    reason?: string;

    @Column({ name: 'verification_code', length: 100, nullable: true })
    verificationCode?: string;

    @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
    verifiedAt?: Date;

    @Column({ name: 'scheduled_for', type: 'timestamptz' })
    scheduledFor!: Date;

    @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
    processedAt?: Date;

    @Column({ name: 'error_message', type: 'text', nullable: true })
    errorMessage?: string;

    @Column({ name: 'backup_reference', type: 'text', nullable: true })
    backupReference?: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt!: Date;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;
}