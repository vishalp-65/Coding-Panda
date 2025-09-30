import { Repository } from 'typeorm';
import { User, AuditLog } from '../entities';
import { AuditService } from './AuditService';
import { AuditResult } from '../entities';
import * as crypto from 'crypto';
import { AppDataSource } from '../config/database';

export interface AnonymizationConfig {
    preserveStatistics: boolean;
    preserveRelationships: boolean;
    hashSensitiveData: boolean;
    retainMinimalData: boolean;
}

export interface AnonymizationResult {
    success: boolean;
    anonymizedFields: string[];
    preservedFields: string[];
    errors?: string[];
}

export class DataAnonymizationService {
    private userRepository: Repository<User>;
    private auditLogRepository: Repository<AuditLog>;
    private auditService: AuditService;

    constructor() {
        this.userRepository = AppDataSource.getRepository(User);
        this.auditLogRepository = AppDataSource.getRepository(AuditLog);
        this.auditService = new AuditService();
    }

    async anonymizeUser(userId: string, config: AnonymizationConfig = {
        preserveStatistics: true,
        preserveRelationships: true,
        hashSensitiveData: true,
        retainMinimalData: false,
    }): Promise<AnonymizationResult> {
        const user = await this.userRepository.findOne({ where: { id: userId } });

        if (!user) {
            throw new Error('User not found');
        }

        const anonymizedFields: string[] = [];
        const preservedFields: string[] = [];
        const errors: string[] = [];

        try {
            // Create anonymized data
            const anonymizedData: Partial<User> = {};

            // Always anonymize PII
            anonymizedData.email = this.generateAnonymizedEmail(userId);
            anonymizedData.username = this.generateAnonymizedUsername(userId);
            anonymizedFields.push('email', 'username');

            // Anonymize profile data
            if (user.profile) {
                const anonymizedProfile = await this.anonymizeProfile(user.profile, config);
                anonymizedData.profile = anonymizedProfile.data;
                anonymizedFields.push(...anonymizedProfile.anonymizedFields);
                preservedFields.push(...anonymizedProfile.preservedFields);
            }

            // Handle preferences
            if (user.preferences) {
                const anonymizedPreferences = this.anonymizePreferences(user.preferences, config);
                anonymizedData.preferences = anonymizedPreferences.data;
                anonymizedFields.push(...anonymizedPreferences.anonymizedFields);
                preservedFields.push(...anonymizedPreferences.preservedFields);
            }

            // Update user record
            await this.userRepository.update(userId, anonymizedData);

            // Anonymize related audit logs
            await this.anonymizeUserAuditLogs(userId, config);

            // Log the anonymization
            await this.auditService.log({
                userId,
                action: 'update',
                resourceType: 'user_anonymization',
                resourceId: userId,
                metadata: {
                    anonymizedFields,
                    preservedFields,
                    config,
                },
            });

            return {
                success: true,
                anonymizedFields,
                preservedFields,
                errors: errors.length > 0 ? errors : undefined,
            };
        } catch (error) {
            errors.push(error instanceof Error ? error.message : 'Unknown error');

            await this.auditService.log({
                userId,
                action: 'update',
                resourceType: 'user_anonymization',
                resourceId: userId,
                result: AuditResult.FAILURE,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
            });

            return {
                success: false,
                anonymizedFields,
                preservedFields,
                errors,
            };
        }
    }

    private generateAnonymizedEmail(userId: string): string {
        const hash = crypto.createHash('sha256').update(userId).digest('hex').substring(0, 8);
        return `anonymized_${hash}@anonymized.local`;
    }

    private generateAnonymizedUsername(userId: string): string {
        const hash = crypto.createHash('sha256').update(userId).digest('hex').substring(0, 8);
        return `anonymized_user_${hash}`;
    }

    private async anonymizeProfile(profile: any, config: AnonymizationConfig): Promise<{
        data: any;
        anonymizedFields: string[];
        preservedFields: string[];
    }> {
        const anonymizedFields: string[] = [];
        const preservedFields: string[] = [];
        const anonymizedProfile = { ...profile };

        // Always anonymize direct PII
        if (profile.firstName) {
            anonymizedProfile.firstName = config.hashSensitiveData
                ? this.hashValue(profile.firstName)
                : 'Anonymous';
            anonymizedFields.push('firstName');
        }

        if (profile.lastName) {
            anonymizedProfile.lastName = config.hashSensitiveData
                ? this.hashValue(profile.lastName)
                : 'User';
            anonymizedFields.push('lastName');
        }

        if (profile.bio) {
            anonymizedProfile.bio = config.retainMinimalData ? '[Anonymized Bio]' : null;
            anonymizedFields.push('bio');
        }

        if (profile.location) {
            anonymizedProfile.location = config.retainMinimalData ? '[Anonymized Location]' : null;
            anonymizedFields.push('location');
        }

        if (profile.website) {
            anonymizedProfile.website = null;
            anonymizedFields.push('website');
        }

        if (profile.githubUsername) {
            anonymizedProfile.githubUsername = null;
            anonymizedFields.push('githubUsername');
        }

        if (profile.linkedinProfile) {
            anonymizedProfile.linkedinProfile = null;
            anonymizedFields.push('linkedinProfile');
        }

        if (profile.company) {
            anonymizedProfile.company = config.retainMinimalData ? '[Anonymized Company]' : null;
            anonymizedFields.push('company');
        }

        if (profile.jobTitle) {
            anonymizedProfile.jobTitle = config.retainMinimalData ? '[Anonymized Job Title]' : null;
            anonymizedFields.push('jobTitle');
        }

        // Preserve technical data if configured
        if (config.preserveStatistics) {
            if (profile.skillLevel) {
                preservedFields.push('skillLevel');
            }
            if (profile.programmingLanguages) {
                preservedFields.push('programmingLanguages');
            }
        } else {
            anonymizedProfile.skillLevel = 'beginner';
            anonymizedProfile.programmingLanguages = [];
            anonymizedFields.push('skillLevel', 'programmingLanguages');
        }

        // Remove avatar
        if (profile.avatar) {
            anonymizedProfile.avatar = null;
            anonymizedFields.push('avatar');
        }

        return {
            data: anonymizedProfile,
            anonymizedFields,
            preservedFields,
        };
    }

    private anonymizePreferences(preferences: any, config: AnonymizationConfig): {
        data: any;
        anonymizedFields: string[];
        preservedFields: string[];
    } {
        const anonymizedFields: string[] = [];
        const preservedFields: string[] = [];
        const anonymizedPreferences = { ...preferences };

        // Preserve functional preferences
        if (preferences.theme) {
            preservedFields.push('theme');
        }

        if (preferences.language) {
            preservedFields.push('language');
        }

        if (preferences.timezone) {
            // Generalize timezone to region level
            if (config.retainMinimalData) {
                const timezone = preferences.timezone;
                const region = timezone.split('/')[0]; // e.g., "America" from "America/New_York"
                anonymizedPreferences.timezone = region || 'UTC';
                anonymizedFields.push('timezone');
            } else {
                anonymizedPreferences.timezone = 'UTC';
                anonymizedFields.push('timezone');
            }
        }

        // Reset notification preferences to defaults
        if (preferences.emailNotifications) {
            anonymizedPreferences.emailNotifications = {
                contestReminders: false,
                newProblems: false,
                achievementUnlocked: false,
                weeklyDigest: false,
                socialActivity: false,
            };
            anonymizedFields.push('emailNotifications');
        }

        // Reset privacy settings to most restrictive
        if (preferences.privacySettings) {
            anonymizedPreferences.privacySettings = {
                profileVisibility: 'private',
                showEmail: false,
                showRealName: false,
                showLocation: false,
                allowDirectMessages: false,
            };
            anonymizedFields.push('privacySettings');
        }

        return {
            data: anonymizedPreferences,
            anonymizedFields,
            preservedFields,
        };
    }

    private async anonymizeUserAuditLogs(userId: string, config: AnonymizationConfig): Promise<void> {
        if (!config.preserveRelationships) {
            // If not preserving relationships, we can delete audit logs
            await this.auditLogRepository.delete({ userId });
            return;
        }

        // Otherwise, anonymize sensitive data in audit logs
        const auditLogs = await this.auditLogRepository.find({ where: { userId } });

        for (const log of auditLogs) {
            const updates: Partial<AuditLog> = {};

            // Anonymize IP addresses
            if (log.ipAddress) {
                updates.ipAddress = this.anonymizeIpAddress(log.ipAddress);
            }

            // Anonymize user agent
            if (log.userAgent) {
                updates.userAgent = '[Anonymized User Agent]';
            }

            // Anonymize sensitive metadata
            if (log.metadata) {
                updates.metadata = this.anonymizeMetadata(log.metadata);
            }

            // Anonymize old/new values that might contain PII
            if (log.oldValues) {
                updates.oldValues = this.anonymizeValues(log.oldValues);
            }

            if (log.newValues) {
                updates.newValues = this.anonymizeValues(log.newValues);
            }

            if (Object.keys(updates).length > 0) {
                await this.auditLogRepository.update(log.id, updates);
            }
        }
    }

    private anonymizeIpAddress(ipAddress: string): string {
        // For IPv4, zero out the last octet
        if (ipAddress.includes('.')) {
            const parts = ipAddress.split('.');
            if (parts.length === 4) {
                return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
            }
        }

        // For IPv6, zero out the last 64 bits
        if (ipAddress.includes(':')) {
            const parts = ipAddress.split(':');
            if (parts.length >= 4) {
                return `${parts.slice(0, 4).join(':')}::`;
            }
        }

        return '[Anonymized IP]';
    }

    private anonymizeMetadata(metadata: Record<string, any>): Record<string, any> {
        const anonymized = { ...metadata };

        // List of fields that commonly contain PII
        const piiFields = ['email', 'firstName', 'lastName', 'name', 'phone', 'address', 'location'];

        for (const field of piiFields) {
            if (anonymized[field]) {
                anonymized[field] = '[Anonymized]';
            }
        }

        return anonymized;
    }

    private anonymizeValues(values: Record<string, any>): Record<string, any> {
        return this.anonymizeMetadata(values);
    }

    private hashValue(value: string): string {
        return crypto.createHash('sha256').update(value).digest('hex').substring(0, 16);
    }

    // Bulk anonymization for research/analytics
    async anonymizeForResearch(userIds: string[]): Promise<{
        successful: string[];
        failed: { userId: string; error: string }[];
    }> {
        const successful: string[] = [];
        const failed: { userId: string; error: string }[] = [];

        const config: AnonymizationConfig = {
            preserveStatistics: true,
            preserveRelationships: true,
            hashSensitiveData: true,
            retainMinimalData: true,
        };

        for (const userId of userIds) {
            try {
                const result = await this.anonymizeUser(userId, config);
                if (result.success) {
                    successful.push(userId);
                } else {
                    failed.push({
                        userId,
                        error: result.errors?.join(', ') || 'Unknown error',
                    });
                }
            } catch (error) {
                failed.push({
                    userId,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        return { successful, failed };
    }

    // Check if user data is already anonymized
    async isUserAnonymized(userId: string): Promise<boolean> {
        const user = await this.userRepository.findOne({ where: { id: userId } });

        if (!user) {
            return false;
        }

        // Check for anonymized patterns
        const isEmailAnonymized = user.email.includes('anonymized') || user.email.endsWith('@anonymized.local');
        const isUsernameAnonymized = user.username.startsWith('anonymized_user_');

        return isEmailAnonymized && isUsernameAnonymized;
    }
}