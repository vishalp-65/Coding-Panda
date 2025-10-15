import { Repository } from 'typeorm';
import { User, AuditLog } from '../entities';
import { AuditService } from './AuditService';
import { AuditResult } from '../entities';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '../config/database';

export interface BackupConfig {
    includeAuditLogs: boolean;
    includeUserData: boolean;
    includeConsents: boolean;
    encryptBackup: boolean;
    compressionLevel: number;
    retentionDays: number;
}

export interface BackupMetadata {
    id: string;
    userId: string;
    createdAt: Date;
    size: number;
    checksum: string;
    encrypted: boolean;
    dataTypes: string[];
    expiresAt: Date;
}

export interface RecoveryOptions {
    backupId: string;
    dataTypes?: string[];
    verifyIntegrity: boolean;
    createAuditLog: boolean;
}

export class BackupRecoveryService {
    private userRepository: Repository<User>;
    private auditService: AuditService;
    private backupDirectory: string;

    constructor() {
        this.userRepository = AppDataSource.getRepository(User);
        this.auditService = new AuditService();
        this.backupDirectory = path.join(process.cwd(), 'backups');
    }

    async createUserBackup(
        userId: string,
        config: BackupConfig = {
            includeAuditLogs: true,
            includeUserData: true,
            includeConsents: true,
            encryptBackup: true,
            compressionLevel: 6,
            retentionDays: 2555, // ~7 years
        }
    ): Promise<BackupMetadata> {
        const backupId = uuidv4();
        const timestamp = new Date();

        try {
            // Ensure backup directory exists
            await fs.mkdir(this.backupDirectory, { recursive: true });

            // Collect user data
            const userData = await this.collectUserData(userId, config);

            // Create backup file
            const backupData = {
                metadata: {
                    id: backupId,
                    userId,
                    createdAt: timestamp,
                    config,
                    version: '1.0',
                },
                data: userData,
            };

            let backupContent = JSON.stringify(backupData, null, 2);

            // Encrypt if requested
            if (config.encryptBackup) {
                backupContent = await this.encryptData(backupContent, userId);
            }

            // Write backup file
            const fileName = `backup_${backupId}_${timestamp.toISOString().split('T')[0]}.json`;
            const filePath = path.join(this.backupDirectory, fileName);
            await fs.writeFile(filePath, backupContent);

            // Calculate file size and checksum
            const stats = await fs.stat(filePath);
            const checksum = await this.calculateChecksum(filePath);

            const metadata: BackupMetadata = {
                id: backupId,
                userId,
                createdAt: timestamp,
                size: stats.size,
                checksum,
                encrypted: config.encryptBackup,
                dataTypes: this.getDataTypes(config),
                expiresAt: new Date(timestamp.getTime() + config.retentionDays * 24 * 60 * 60 * 1000),
            };

            // Save metadata
            await this.saveBackupMetadata(metadata);

            // Log backup creation
            await this.auditService.log({
                userId,
                action: 'create',
                resourceType: 'data_backup',
                resourceId: backupId,
                metadata: {
                    backupSize: stats.size,
                    encrypted: config.encryptBackup,
                    dataTypes: metadata.dataTypes,
                    retentionDays: config.retentionDays,
                },
            });

            return metadata;
        } catch (error) {
            await this.auditService.log({
                userId,
                action: 'create',
                resourceType: 'data_backup',
                result: AuditResult.FAILURE,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
            });

            throw new Error(`Backup creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async restoreUserData(
        userId: string,
        options: RecoveryOptions
    ): Promise<{
        success: boolean;
        restoredDataTypes: string[];
        errors?: string[];
    }> {
        const errors: string[] = [];
        const restoredDataTypes: string[] = [];

        try {
            // Load backup metadata
            const metadata = await this.loadBackupMetadata(options.backupId);
            if (!metadata) {
                throw new Error('Backup not found');
            }

            if (metadata.userId !== userId) {
                throw new Error('Backup does not belong to this user');
            }

            if (new Date() > metadata.expiresAt) {
                throw new Error('Backup has expired');
            }

            // Load backup data
            const backupData = await this.loadBackupData(options.backupId, metadata.encrypted);

            // Verify integrity if requested
            if (options.verifyIntegrity) {
                const isValid = await this.verifyBackupIntegrity(options.backupId, metadata.checksum);
                if (!isValid) {
                    throw new Error('Backup integrity verification failed');
                }
            }

            // Restore data based on requested types
            const requestedTypes = options.dataTypes || metadata.dataTypes;

            for (const dataType of requestedTypes) {
                try {
                    await this.restoreDataType(userId, dataType, backupData.data);
                    restoredDataTypes.push(dataType);
                } catch (error) {
                    errors.push(`Failed to restore ${dataType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }

            // Create audit log if requested
            if (options.createAuditLog) {
                await this.auditService.log({
                    userId,
                    action: 'update',
                    resourceType: 'data_recovery',
                    resourceId: options.backupId,
                    metadata: {
                        restoredDataTypes,
                        errors: errors.length > 0 ? errors : undefined,
                        backupDate: metadata.createdAt,
                    },
                });
            }

            return {
                success: errors.length === 0,
                restoredDataTypes,
                errors: errors.length > 0 ? errors : undefined,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            errors.push(errorMessage);

            if (options.createAuditLog) {
                await this.auditService.log({
                    userId,
                    action: 'update',
                    resourceType: 'data_recovery',
                    resourceId: options.backupId,
                    result: AuditResult.FAILURE,
                    errorMessage,
                });
            }

            return {
                success: false,
                restoredDataTypes,
                errors,
            };
        }
    }

    async listUserBackups(userId: string): Promise<BackupMetadata[]> {
        try {
            const metadataFiles = await fs.readdir(this.backupDirectory);
            const userBackups: BackupMetadata[] = [];

            for (const file of metadataFiles) {
                if (file.endsWith('.metadata.json')) {
                    try {
                        const metadataPath = path.join(this.backupDirectory, file);
                        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
                        const metadata: BackupMetadata = JSON.parse(metadataContent);

                        if (metadata.userId === userId && new Date() <= metadata.expiresAt) {
                            userBackups.push(metadata);
                        }
                    } catch (error) {
                        // Skip invalid metadata files
                        continue;
                    }
                }
            }

            return userBackups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        } catch (error) {
            throw new Error(`Failed to list backups: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async deleteBackup(backupId: string, userId: string): Promise<void> {
        try {
            const metadata = await this.loadBackupMetadata(backupId);
            if (!metadata) {
                throw new Error('Backup not found');
            }

            if (metadata.userId !== userId) {
                throw new Error('Backup does not belong to this user');
            }

            // Delete backup file
            const backupFileName = `backup_${backupId}_${metadata.createdAt.toISOString().split('T')[0]}.json`;
            const backupPath = path.join(this.backupDirectory, backupFileName);

            try {
                await fs.unlink(backupPath);
            } catch (error) {
                // File might not exist, continue with metadata deletion
            }

            // Delete metadata file
            const metadataPath = path.join(this.backupDirectory, `${backupId}.metadata.json`);
            await fs.unlink(metadataPath);

            await this.auditService.log({
                userId,
                action: 'delete',
                resourceType: 'data_backup',
                resourceId: backupId,
                metadata: {
                    backupDate: metadata.createdAt,
                    dataTypes: metadata.dataTypes,
                },
            });
        } catch (error) {
            await this.auditService.log({
                userId,
                action: 'delete',
                resourceType: 'data_backup',
                resourceId: backupId,
                result: AuditResult.FAILURE,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
            });

            throw error;
        }
    }

    async cleanupExpiredBackups(): Promise<{
        deletedCount: number;
        errors: string[];
    }> {
        const errors: string[] = [];
        let deletedCount = 0;

        try {
            const files = await fs.readdir(this.backupDirectory);
            const now = new Date();

            for (const file of files) {
                if (file.endsWith('.metadata.json')) {
                    try {
                        const metadataPath = path.join(this.backupDirectory, file);
                        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
                        const metadata: BackupMetadata = JSON.parse(metadataContent);

                        if (now > metadata.expiresAt) {
                            await this.deleteBackup(metadata.id, metadata.userId);
                            deletedCount++;
                        }
                    } catch (error) {
                        errors.push(`Failed to process ${file}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    }
                }
            }

            return { deletedCount, errors };
        } catch (error) {
            errors.push(`Failed to cleanup backups: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return { deletedCount, errors };
        }
    }

    private async collectUserData(userId: string, config: BackupConfig): Promise<any> {
        const data: any = {};

        if (config.includeUserData) {
            const user = await this.userRepository.findOne({
                where: { id: userId },
                relations: ['sessions', 'stats'],
            });

            if (user) {
                data.user = user.toSafeObject();
            }
        }

        if (config.includeConsents) {
            // This would be implemented with the privacy consent repository
            data.consents = []; // Placeholder
        }

        if (config.includeAuditLogs) {
            const auditLogs = await this.auditService.getUserAuditLogs(userId, 10000);
            data.auditLogs = auditLogs;
        }

        return data;
    }

    private async encryptData(data: string, userId: string): Promise<string> {
        const algorithm = 'aes-256-gcm';
        const key = crypto.scryptSync(userId, 'backup-salt', 32);
        const iv = crypto.randomBytes(16);

        const cipher = crypto.createCipheriv(algorithm, key, iv);
        cipher.setAAD(Buffer.from(userId));

        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag();

        return JSON.stringify({
            encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex'),
            algorithm,
        });
    }

    private async decryptData(encryptedData: string, userId: string): Promise<string> {
        const { encrypted, iv, authTag, algorithm } = JSON.parse(encryptedData);
        const key = crypto.scryptSync(userId, 'backup-salt', 32);

        const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, 'hex'));
        decipher.setAAD(Buffer.from(userId));
        decipher.setAuthTag(Buffer.from(authTag, 'hex'));

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }

    private async calculateChecksum(filePath: string): Promise<string> {
        const fileBuffer = await fs.readFile(filePath);
        return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    }

    private async saveBackupMetadata(metadata: BackupMetadata): Promise<void> {
        const metadataPath = path.join(this.backupDirectory, `${metadata.id}.metadata.json`);
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    }

    private async loadBackupMetadata(backupId: string): Promise<BackupMetadata | null> {
        try {
            const metadataPath = path.join(this.backupDirectory, `${backupId}.metadata.json`);
            const metadataContent = await fs.readFile(metadataPath, 'utf-8');
            return JSON.parse(metadataContent);
        } catch (error) {
            return null;
        }
    }

    private async loadBackupData(backupId: string, encrypted: boolean): Promise<any> {
        const metadata = await this.loadBackupMetadata(backupId);
        if (!metadata) {
            throw new Error('Backup metadata not found');
        }

        const backupFileName = `backup_${backupId}_${metadata.createdAt.toISOString().split('T')[0]}.json`;
        const backupPath = path.join(this.backupDirectory, backupFileName);

        let backupContent = await fs.readFile(backupPath, 'utf-8');

        if (encrypted) {
            backupContent = await this.decryptData(backupContent, metadata.userId);
        }

        return JSON.parse(backupContent);
    }

    private async verifyBackupIntegrity(backupId: string, expectedChecksum: string): Promise<boolean> {
        try {
            const metadata = await this.loadBackupMetadata(backupId);
            if (!metadata) {
                return false;
            }

            const backupFileName = `backup_${backupId}_${metadata.createdAt.toISOString().split('T')[0]}.json`;
            const backupPath = path.join(this.backupDirectory, backupFileName);

            const actualChecksum = await this.calculateChecksum(backupPath);
            return actualChecksum === expectedChecksum;
        } catch (error) {
            return false;
        }
    }

    private async restoreDataType(userId: string, dataType: string, backupData: any): Promise<void> {
        switch (dataType) {
            case 'user':
                if (backupData.user) {
                    await this.userRepository.update(userId, {
                        profile: backupData.user.profile,
                        preferences: backupData.user.preferences,
                    });
                }
                break;
            case 'consents':
                // Implementation would restore privacy consents
                break;
            case 'auditLogs':
                // Audit logs are typically not restored as they represent historical events
                break;
            default:
                throw new Error(`Unknown data type: ${dataType}`);
        }
    }

    private getDataTypes(config: BackupConfig): string[] {
        const types: string[] = [];

        if (config.includeUserData) types.push('user');
        if (config.includeConsents) types.push('consents');
        if (config.includeAuditLogs) types.push('auditLogs');

        return types;
    }
}