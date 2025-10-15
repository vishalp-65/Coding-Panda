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

export enum ExportStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
    EXPIRED = 'expired',
}

export enum ExportFormat {
    JSON = 'json',
    CSV = 'csv',
    XML = 'xml',
}

@Entity('data_export_requests')
export class DataExportRequest {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'user_id' })
    userId!: string;

    @Column({
        type: 'enum',
        enum: ExportStatus,
        default: ExportStatus.PENDING,
    })
    status!: ExportStatus;

    @Column({
        type: 'enum',
        enum: ExportFormat,
        default: ExportFormat.JSON,
    })
    format!: ExportFormat;

    @Column({ name: 'data_types', type: 'text', array: true })
    dataTypes!: string[];

    @Column({ name: 'file_path', type: 'text', nullable: true })
    filePath?: string;

    @Column({ name: 'file_size', type: 'bigint', nullable: true })
    fileSize?: number;

    @Column({ name: 'download_url', type: 'text', nullable: true })
    downloadUrl?: string;

    @Column({ name: 'expires_at', type: 'timestamptz' })
    expiresAt!: Date;

    @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
    processedAt?: Date;

    @Column({ name: 'error_message', type: 'text', nullable: true })
    errorMessage?: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt!: Date;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;
}