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

export enum ConsentType {
    DATA_PROCESSING = 'data_processing',
    MARKETING = 'marketing',
    ANALYTICS = 'analytics',
    THIRD_PARTY_SHARING = 'third_party_sharing',
    COOKIES = 'cookies',
}

export enum ConsentStatus {
    GRANTED = 'granted',
    DENIED = 'denied',
    WITHDRAWN = 'withdrawn',
}

@Entity('privacy_consents')
export class PrivacyConsent {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'user_id' })
    userId!: string;

    @Column({
        type: 'enum',
        enum: ConsentType,
        name: 'consent_type',
    })
    consentType!: ConsentType;

    @Column({
        type: 'enum',
        enum: ConsentStatus,
        name: 'consent_status',
    })
    consentStatus!: ConsentStatus;

    @Column({ name: 'consent_version', length: 50 })
    consentVersion!: string;

    @Column({ name: 'consent_text', type: 'text' })
    consentText!: string;

    @Column({ name: 'ip_address', length: 45, nullable: true })
    ipAddress?: string;

    @Column({ name: 'user_agent', type: 'text', nullable: true })
    userAgent?: string;

    @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
    expiresAt?: Date;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt!: Date;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user!: User;
}