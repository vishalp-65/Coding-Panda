import { Repository } from 'typeorm';
import {
    PrivacyConsent,
    ConsentType,
    ConsentStatus,
    DataExportRequest,
    ExportStatus,
    ExportFormat,
    DataDeletionRequest,
    DeletionStatus,
    DeletionType,
    User,
} from '../entities';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import * as path from 'path';
import { AuditService } from './AuditService';
import { AuditResult } from '../entities';
import { AppDataSource } from '../config/database';

export interface ConsentRequest {
    userId: string;
    consentType: ConsentType;
    consentStatus: ConsentStatus;
    consentVersion: string;
    consentText: string;
    ipAddress?: string;
    userAgent?: string;
}

export interface ExportRequest {
    userId: string;
    format: ExportFormat;
    dataTypes: string[];
}

export interface DeletionRequest {
    userId: string;
    deletionType: DeletionType;
    dataTypes?: string[];
    reason?: string;
}

export interface UserDataExport {
    user: Partial<User>;
    submissions?: any[];
    contests?: any[];
    analytics?: any[];
    consents: PrivacyConsent[];
    auditLogs?: any[];
}

export class PrivacyService {
    private privacyConsentRepository: Repository<PrivacyConsent>;
    private dataExportRepository: Repository<DataExportRequest>;
    private dataDeletionRepository: Repository<DataDeletionRequest>;
    private userRepository: Repository<User>;
    private auditService: AuditService;

    constructor() {
        this.privacyConsentRepository = AppDataSource.getRepository(PrivacyConsent);
        this.dataExportRepository = AppDataSource.getRepository(DataExportRequest);
        this.dataDeletionRepository = AppDataSource.getRepository(DataDeletionRequest);
        this.userRepository = AppDataSource.getRepository(User);
        this.auditService = new AuditService();
    }

    // Consent Management
    async recordConsent(request: ConsentRequest): Promise<PrivacyConsent> {
        const consent = this.privacyConsentRepository.create({
            userId: request.userId,
            consentType: request.consentType,
            consentStatus: request.consentStatus,
            consentVersion: request.consentVersion,
            consentText: request.consentText,
            ipAddress: request.ipAddress,
            userAgent: request.userAgent,
        });

        const savedConsent = await this.privacyConsentRepository.save(consent);

        await this.auditService.log({
            userId: request.userId,
            action: request.consentStatus === ConsentStatus.GRANTED ? 'consent_granted' : 'consent_withdrawn',
            resourceType: 'privacy_consent',
            resourceId: savedConsent.id,
            ipAddress: request.ipAddress,
            userAgent: request.userAgent,
            metadata: {
                consentType: request.consentType,
                consentVersion: request.consentVersion,
            },
        });

        return savedConsent;
    }

    async getUserConsents(userId: string): Promise<PrivacyConsent[]> {
        return this.privacyConsentRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }

    async getLatestConsent(userId: string, consentType: ConsentType): Promise<PrivacyConsent | null> {
        return this.privacyConsentRepository.findOne({
            where: { userId, consentType },
            order: { createdAt: 'DESC' },
        });
    }

    async withdrawConsent(userId: string, consentType: ConsentType, ipAddress?: string, userAgent?: string): Promise<PrivacyConsent> {
        const latestConsent = await this.getLatestConsent(userId, consentType);

        if (!latestConsent || latestConsent.consentStatus !== ConsentStatus.GRANTED) {
            throw new Error('No active consent found to withdraw');
        }

        return this.recordConsent({
            userId,
            consentType,
            consentStatus: ConsentStatus.WITHDRAWN,
            consentVersion: latestConsent.consentVersion,
            consentText: latestConsent.consentText,
            ipAddress,
            userAgent,
        });
    }

    // Data Export (GDPR Article 20)
    async requestDataExport(request: ExportRequest): Promise<DataExportRequest> {
        const exportRequest = this.dataExportRepository.create({
            userId: request.userId,
            format: request.format,
            dataTypes: request.dataTypes,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        });

        const savedRequest = await this.dataExportRepository.save(exportRequest);

        await this.auditService.log({
            userId: request.userId,
            action: 'export',
            resourceType: 'data_export_request',
            resourceId: savedRequest.id,
            metadata: {
                format: request.format,
                dataTypes: request.dataTypes,
            },
        });

        // Process export asynchronously
        this.processDataExport(savedRequest.id).catch(console.error);

        return savedRequest;
    }

    async processDataExport(requestId: string): Promise<void> {
        const exportRequest = await this.dataExportRepository.findOne({
            where: { id: requestId },
            relations: ['user'],
        });

        if (!exportRequest) {
            throw new Error('Export request not found');
        }

        try {
            await this.dataExportRepository.update(requestId, {
                status: ExportStatus.PROCESSING,
            });

            const userData = await this.collectUserData(exportRequest.userId, exportRequest.dataTypes);
            const filePath = await this.generateExportFile(userData, exportRequest.format, requestId);
            const fileStats = await fs.stat(filePath);

            await this.dataExportRepository.update(requestId, {
                status: ExportStatus.COMPLETED,
                filePath,
                fileSize: fileStats.size,
                downloadUrl: `/api/v1/privacy/export/${requestId}/download`,
                processedAt: new Date(),
            });

            await this.auditService.log({
                userId: exportRequest.userId,
                action: 'export',
                resourceType: 'data_export_request',
                resourceId: requestId,
                result: AuditResult.SUCCESS,
                metadata: {
                    fileSize: fileStats.size,
                    dataTypes: exportRequest.dataTypes,
                },
            });
        } catch (error) {
            await this.dataExportRepository.update(requestId, {
                status: ExportStatus.FAILED,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
            });

            await this.auditService.log({
                userId: exportRequest.userId,
                action: 'export',
                resourceType: 'data_export_request',
                resourceId: requestId,
                result: AuditResult.FAILURE,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    private async collectUserData(userId: string, dataTypes: string[]): Promise<UserDataExport> {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new Error('User not found');
        }

        const userData: UserDataExport = {
            user: user.toSafeObject(),
            consents: await this.getUserConsents(userId),
        };

        // Collect additional data based on requested types
        if (dataTypes.includes('submissions')) {
            // TODO: Collect from submission service
            userData.submissions = [];
        }

        if (dataTypes.includes('contests')) {
            // TODO: Collect from contest service
            userData.contests = [];
        }

        if (dataTypes.includes('analytics')) {
            // TODO: Collect from analytics service
            userData.analytics = [];
        }

        if (dataTypes.includes('audit_logs')) {
            userData.auditLogs = await this.auditService.getUserAuditLogs(userId);
        }

        return userData;
    }

    private async generateExportFile(data: UserDataExport, format: ExportFormat, requestId: string): Promise<string> {
        const exportDir = path.join(process.cwd(), 'exports');
        await fs.mkdir(exportDir, { recursive: true });

        const fileName = `user_data_${requestId}.${format}`;
        const filePath = path.join(exportDir, fileName);

        switch (format) {
            case ExportFormat.JSON:
                await fs.writeFile(filePath, JSON.stringify(data, null, 2));
                break;
            case ExportFormat.CSV:
                // Simple CSV implementation - in production, use a proper CSV library
                const csvData = this.convertToCSV(data);
                await fs.writeFile(filePath, csvData);
                break;
            case ExportFormat.XML:
                const xmlData = this.convertToXML(data);
                await fs.writeFile(filePath, xmlData);
                break;
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }

        return filePath;
    }

    private convertToCSV(data: UserDataExport): string {
        // Simplified CSV conversion - in production, use a proper CSV library
        const lines: string[] = [];

        // User data
        lines.push('Type,Field,Value');
        if (data.user) {
            Object.entries(data.user).forEach(([key, value]) => {
                lines.push(`User,${key},"${JSON.stringify(value)}"`);
            });
        }

        // Consents
        data.consents.forEach((consent, index) => {
            lines.push(`Consent ${index + 1},Type,${consent.consentType}`);
            lines.push(`Consent ${index + 1},Status,${consent.consentStatus}`);
            lines.push(`Consent ${index + 1},Date,${consent.createdAt.toISOString()}`);
        });

        return lines.join('\n');
    }

    private convertToXML(data: UserDataExport): string {
        // Simplified XML conversion - in production, use a proper XML library
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<UserData>\n';

        if (data.user) {
            xml += '  <User>\n';
            Object.entries(data.user).forEach(([key, value]) => {
                xml += `    <${key}>${JSON.stringify(value)}</${key}>\n`;
            });
            xml += '  </User>\n';
        }

        xml += '  <Consents>\n';
        data.consents.forEach((consent, index) => {
            xml += `    <Consent id="${index + 1}">\n`;
            xml += `      <Type>${consent.consentType}</Type>\n`;
            xml += `      <Status>${consent.consentStatus}</Status>\n`;
            xml += `      <Date>${consent.createdAt.toISOString()}</Date>\n`;
            xml += '    </Consent>\n';
        });
        xml += '  </Consents>\n';

        xml += '</UserData>';
        return xml;
    }

    // Data Deletion (GDPR Article 17)
    async requestDataDeletion(request: DeletionRequest): Promise<DataDeletionRequest> {
        const verificationCode = uuidv4();

        const deletionRequest = this.dataDeletionRepository.create({
            userId: request.userId,
            deletionType: request.deletionType,
            dataTypes: request.dataTypes,
            reason: request.reason,
            verificationCode,
            scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days grace period
        });

        const savedRequest = await this.dataDeletionRepository.save(deletionRequest);

        await this.auditService.log({
            userId: request.userId,
            action: 'delete',
            resourceType: 'data_deletion_request',
            resourceId: savedRequest.id,
            metadata: {
                deletionType: request.deletionType,
                dataTypes: request.dataTypes,
                reason: request.reason,
            },
        });

        return savedRequest;
    }

    async verifyDataDeletion(requestId: string, verificationCode: string): Promise<DataDeletionRequest> {
        const deletionRequest = await this.dataDeletionRepository.findOne({
            where: { id: requestId, verificationCode },
        });

        if (!deletionRequest) {
            throw new Error('Invalid deletion request or verification code');
        }

        if (deletionRequest.verifiedAt) {
            throw new Error('Deletion request already verified');
        }

        await this.dataDeletionRepository.update(requestId, {
            verifiedAt: new Date(),
        });

        // Schedule immediate processing if verified
        this.processDataDeletion(requestId).catch(console.error);

        return deletionRequest;
    }

    async processDataDeletion(requestId: string): Promise<void> {
        const deletionRequest = await this.dataDeletionRepository.findOne({
            where: { id: requestId },
            relations: ['user'],
        });

        if (!deletionRequest) {
            throw new Error('Deletion request not found');
        }

        if (!deletionRequest.verifiedAt) {
            throw new Error('Deletion request not verified');
        }

        try {
            await this.dataDeletionRepository.update(requestId, {
                status: DeletionStatus.PROCESSING,
            });

            // Create backup before deletion
            const backupRef = await this.createDataBackup(deletionRequest.userId);

            if (deletionRequest.deletionType === DeletionType.FULL_ACCOUNT) {
                await this.deleteUserAccount(deletionRequest.userId);
            } else if (deletionRequest.deletionType === DeletionType.ANONYMIZATION) {
                await this.anonymizeUserData(deletionRequest.userId);
            } else {
                await this.deletePartialData(deletionRequest.userId, deletionRequest.dataTypes || []);
            }

            await this.dataDeletionRepository.update(requestId, {
                status: DeletionStatus.COMPLETED,
                processedAt: new Date(),
                backupReference: backupRef,
            });

            await this.auditService.log({
                userId: deletionRequest.userId,
                action: 'delete',
                resourceType: 'user_data',
                result: AuditResult.SUCCESS,
                metadata: {
                    deletionType: deletionRequest.deletionType,
                    backupReference: backupRef,
                },
            });
        } catch (error) {
            await this.dataDeletionRepository.update(requestId, {
                status: DeletionStatus.FAILED,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
            });

            await this.auditService.log({
                userId: deletionRequest.userId,
                action: 'delete',
                resourceType: 'user_data',
                result: AuditResult.FAILURE,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    private async createDataBackup(userId: string): Promise<string> {
        const backupId = uuidv4();
        const userData = await this.collectUserData(userId, ['all']);

        const backupDir = path.join(process.cwd(), 'backups');
        await fs.mkdir(backupDir, { recursive: true });

        const backupPath = path.join(backupDir, `backup_${backupId}.json`);
        await fs.writeFile(backupPath, JSON.stringify(userData, null, 2));

        return backupId;
    }

    private async deleteUserAccount(userId: string): Promise<void> {
        // Delete user and all related data (cascading deletes should handle most)
        await this.userRepository.delete(userId);

        // TODO: Call other services to delete related data
        // - Submissions
        // - Contest participations
        // - Analytics data
        // - Notifications
    }

    private async anonymizeUserData(userId: string): Promise<void> {
        const anonymizedEmail = `deleted_user_${Date.now()}@anonymized.local`;
        const anonymizedUsername = `deleted_user_${Date.now()}`;

        await this.userRepository.update(userId, {
            email: anonymizedEmail,
            username: anonymizedUsername,
            profile: {
                firstName: 'Deleted',
                lastName: 'User',
                bio: undefined,
                location: undefined,
                website: undefined,
                githubUsername: undefined,
                linkedinProfile: undefined,
                company: undefined,
                jobTitle: undefined,
                skillLevel: 'beginner',
                programmingLanguages: [],
            },
        });
    }

    private async deletePartialData(userId: string, dataTypes: string[]): Promise<void> {
        // Implementation depends on specific data types to delete
        for (const dataType of dataTypes) {
            switch (dataType) {
                case 'profile':
                    await this.userRepository.update(userId, {
                        profile: {
                            skillLevel: 'beginner',
                            programmingLanguages: [],
                        },
                    });
                    break;
                case 'submissions':
                    // TODO: Call submission service to delete submissions
                    break;
                case 'analytics':
                    // TODO: Call analytics service to delete user analytics
                    break;
            }
        }
    }

    // Utility methods
    async getExportRequest(requestId: string): Promise<DataExportRequest | null> {
        return this.dataExportRepository.findOne({ where: { id: requestId } });
    }

    async getDeletionRequest(requestId: string): Promise<DataDeletionRequest | null> {
        return this.dataDeletionRepository.findOne({ where: { id: requestId } });
    }

    async getUserExportRequests(userId: string): Promise<DataExportRequest[]> {
        return this.dataExportRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }

    async getUserDeletionRequests(userId: string): Promise<DataDeletionRequest[]> {
        return this.dataDeletionRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }
}