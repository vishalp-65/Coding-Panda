import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
} from 'typeorm';

export enum AuditAction {
    CREATE = 'create',
    READ = 'read',
    UPDATE = 'update',
    DELETE = 'delete',
    LOGIN = 'login',
    LOGOUT = 'logout',
    EXPORT = 'export',
    CONSENT_GRANTED = 'consent_granted',
    CONSENT_WITHDRAWN = 'consent_withdrawn',
    PASSWORD_RESET = 'password_reset',
    EMAIL_VERIFIED = 'email_verified',
    TWO_FACTOR_ENABLED = 'two_factor_enabled',
    TWO_FACTOR_DISABLED = 'two_factor_disabled',
}

export enum AuditResult {
    SUCCESS = 'success',
    FAILURE = 'failure',
    PARTIAL = 'partial',
}

@Entity('audit_logs')
@Index(['userId', 'createdAt'])
@Index(['action', 'createdAt'])
@Index(['resourceType', 'resourceId'])
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'user_id', nullable: true })
    userId?: string;

    @Column({ name: 'session_id', nullable: true })
    sessionId?: string;

    @Column({
        type: 'enum',
        enum: AuditAction,
    })
    action!: AuditAction;

    @Column({ name: 'resource_type', length: 100 })
    resourceType!: string;

    @Column({ name: 'resource_id', nullable: true })
    resourceId?: string;

    @Column({
        type: 'enum',
        enum: AuditResult,
        default: AuditResult.SUCCESS,
    })
    result!: AuditResult;

    @Column({ name: 'ip_address', length: 45, nullable: true })
    ipAddress?: string;

    @Column({ name: 'user_agent', type: 'text', nullable: true })
    userAgent?: string;

    @Column({ name: 'request_id', nullable: true })
    requestId?: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata?: Record<string, any>;

    @Column({ name: 'old_values', type: 'jsonb', nullable: true })
    oldValues?: Record<string, any>;

    @Column({ name: 'new_values', type: 'jsonb', nullable: true })
    newValues?: Record<string, any>;

    @Column({ name: 'error_message', type: 'text', nullable: true })
    errorMessage?: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date;
}