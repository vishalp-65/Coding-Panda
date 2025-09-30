import { Repository } from 'typeorm';
import {
    User,
    PrivacyConsent,
    DataExportRequest,
    DataDeletionRequest,
    AuditLog,
    ConsentType,
    ConsentStatus,
    ExportStatus,
    DeletionStatus,
    AuditAction
} from '../entities';
import { AuditService } from './AuditService';
import * as fs from 'fs/promises';
import * as path from 'path';
import { AppDataSource } from '../database/connection';

export interface ComplianceMetrics {
    totalUsers: number;
    activeUsers: number;
    consentMetrics: {
        totalConsents: number;
        grantedConsents: number;
        withdrawnConsents: number;
        consentsByType: Record<ConsentType, number>;
    };
    dataRequests: {
        exportRequests: number;
        deletionRequests: number;
        completedExports: number;
        completedDeletions: number;
    };
    auditMetrics: {
        totalEvents: number;
        securityEvents: number;
        dataAccessEvents: number;
        dataModificationEvents: number;
    };
    complianceScore: number;
}

export interface GDPRReport {
    reportId: string;
    generatedAt: Date;
    period: {
        startDate: Date;
        endDate: Date;
    };
    metrics: ComplianceMetrics;
    recommendations: string[];
    riskAssessment: {
        level: 'low' | 'medium' | 'high';
        issues: string[];
    };
}

export class ComplianceReportingService {
    private userRepository: Repository<User>;
    private privacyConsentRepository: Repository<PrivacyConsent>;
    private dataExportRepository: Repository<DataExportRequest>;
    private dataDeletionRepository: Repository<DataDeletionRequest>;
    private auditLogRepository: Repository<AuditLog>;
    private auditService: AuditService;

    constructor() {
        this.userRepository = AppDataSource.getRepository(User);
        this.privacyConsentRepository = AppDataSource.getRepository(PrivacyConsent);
        this.dataExportRepository = AppDataSource.getRepository(DataExportRequest);
        this.dataDeletionRepository = AppDataSource.getRepository(DataDeletionRequest);
        this.auditLogRepository = AppDataSource.getRepository(AuditLog);
        this.auditService = new AuditService();
    }

    async generateGDPRReport(startDate: Date, endDate: Date): Promise<GDPRReport> {
        const reportId = `gdpr_${Date.now()}`;
        const metrics = await this.calculateComplianceMetrics(startDate, endDate);

        const report: GDPRReport = {
            reportId,
            generatedAt: new Date(),
            period: { startDate, endDate },
            metrics,
            recommendations: this.generateRecommendations(metrics),
            riskAssessment: this.assessRisks(metrics),
        };

        // Save report
        await this.saveReport(report);

        return report;
    }
    private async calculateComplianceMetrics(startDate: Date, endDate: Date): Promise<ComplianceMetrics> {
        // User metrics
        const totalUsers = await this.userRepository.count();
        const activeUsers = await this.userRepository
            .createQueryBuilder('user')
            .where('user.updatedAt >= :startDate', { startDate })
            .getCount();

        // Consent metrics
        const totalConsents = await this.privacyConsentRepository.count({
            where: {
                createdAt: { $gte: startDate, $lte: endDate } as any,
            },
        });

        const grantedConsents = await this.privacyConsentRepository.count({
            where: {
                consentStatus: ConsentStatus.GRANTED,
                createdAt: { $gte: startDate, $lte: endDate } as any,
            },
        });

        const withdrawnConsents = await this.privacyConsentRepository.count({
            where: {
                consentStatus: ConsentStatus.WITHDRAWN,
                createdAt: { $gte: startDate, $lte: endDate } as any,
            },
        });

        // Consent by type
        const consentsByType: Record<ConsentType, number> = {} as any;
        for (const type of Object.values(ConsentType)) {
            consentsByType[type] = await this.privacyConsentRepository.count({
                where: {
                    consentType: type,
                    consentStatus: ConsentStatus.GRANTED,
                    createdAt: { $gte: startDate, $lte: endDate } as any,
                },
            });
        }

        // Data request metrics
        const exportRequests = await this.dataExportRepository.count({
            where: {
                createdAt: { $gte: startDate, $lte: endDate } as any,
            },
        });

        const deletionRequests = await this.dataDeletionRepository.count({
            where: {
                createdAt: { $gte: startDate, $lte: endDate } as any,
            },
        });

        const completedExports = await this.dataExportRepository.count({
            where: {
                status: ExportStatus.COMPLETED,
                createdAt: { $gte: startDate, $lte: endDate } as any,
            },
        });

        const completedDeletions = await this.dataDeletionRepository.count({
            where: {
                status: DeletionStatus.COMPLETED,
                createdAt: { $gte: startDate, $lte: endDate } as any,
            },
        });

        // Audit metrics
        const totalEvents = await this.auditLogRepository.count({
            where: {
                createdAt: { $gte: startDate, $lte: endDate } as any,
            },
        });

        const securityEvents = await this.auditLogRepository.count({
            where: {
                resourceType: 'security',
                createdAt: { $gte: startDate, $lte: endDate } as any,
            },
        });

        const dataAccessEvents = await this.auditLogRepository.count({
            where: {
                action: AuditAction.READ,
                createdAt: { $gte: startDate, $lte: endDate } as any,
            },
        });

        const dataModificationEvents = await this.auditLogRepository.count({
            where: {
                action: { $in: ['create', 'update', 'delete'] } as any,
                createdAt: { $gte: startDate, $lte: endDate } as any,
            },
        });

        // Calculate compliance score (0-100)
        const complianceScore = this.calculateComplianceScore({
            consentRate: totalConsents > 0 ? (grantedConsents / totalConsents) * 100 : 100,
            requestFulfillmentRate: exportRequests > 0 ? (completedExports / exportRequests) * 100 : 100,
            deletionFulfillmentRate: deletionRequests > 0 ? (completedDeletions / deletionRequests) * 100 : 100,
            auditCoverage: totalEvents > 0 ? 100 : 0,
        });

        return {
            totalUsers,
            activeUsers,
            consentMetrics: {
                totalConsents,
                grantedConsents,
                withdrawnConsents,
                consentsByType,
            },
            dataRequests: {
                exportRequests,
                deletionRequests,
                completedExports,
                completedDeletions,
            },
            auditMetrics: {
                totalEvents,
                securityEvents,
                dataAccessEvents,
                dataModificationEvents,
            },
            complianceScore,
        };
    }

    private calculateComplianceScore(factors: {
        consentRate: number;
        requestFulfillmentRate: number;
        deletionFulfillmentRate: number;
        auditCoverage: number;
    }): number {
        const weights = {
            consentRate: 0.3,
            requestFulfillmentRate: 0.3,
            deletionFulfillmentRate: 0.3,
            auditCoverage: 0.1,
        };

        return Math.round(
            factors.consentRate * weights.consentRate +
            factors.requestFulfillmentRate * weights.requestFulfillmentRate +
            factors.deletionFulfillmentRate * weights.deletionFulfillmentRate +
            factors.auditCoverage * weights.auditCoverage
        );
    }

    private generateRecommendations(metrics: ComplianceMetrics): string[] {
        const recommendations: string[] = [];

        if (metrics.complianceScore < 80) {
            recommendations.push('Overall compliance score is below recommended threshold (80%). Review and improve data protection practices.');
        }

        if (metrics.dataRequests.exportRequests > metrics.dataRequests.completedExports) {
            recommendations.push('Some data export requests are pending. Ensure timely processing within 30 days as required by GDPR.');
        }

        if (metrics.dataRequests.deletionRequests > metrics.dataRequests.completedDeletions) {
            recommendations.push('Some data deletion requests are pending. Process deletion requests promptly to comply with "right to be forgotten".');
        }

        if (metrics.consentMetrics.withdrawnConsents > metrics.consentMetrics.grantedConsents * 0.1) {
            recommendations.push('High consent withdrawal rate detected. Review consent processes and user experience.');
        }

        if (metrics.auditMetrics.totalEvents === 0) {
            recommendations.push('No audit events recorded. Ensure comprehensive audit logging is implemented and functioning.');
        }

        return recommendations;
    }

    private assessRisks(metrics: ComplianceMetrics): { level: 'low' | 'medium' | 'high'; issues: string[] } {
        const issues: string[] = [];
        let riskLevel: 'low' | 'medium' | 'high' = 'low';

        if (metrics.complianceScore < 60) {
            issues.push('Critical compliance score - immediate action required');
            riskLevel = 'high';
        } else if (metrics.complianceScore < 80) {
            issues.push('Below-average compliance score - improvement needed');
            riskLevel = 'medium';
        }

        if (metrics.dataRequests.exportRequests > 0 && metrics.dataRequests.completedExports === 0) {
            issues.push('No data export requests have been fulfilled');
            riskLevel = riskLevel === 'high' ? 'high' : 'medium';
        }

        if (metrics.auditMetrics.securityEvents > metrics.auditMetrics.totalEvents * 0.1) {
            issues.push('High number of security events detected');
            riskLevel = 'high';
        }

        return { level: riskLevel, issues };
    }

    private async saveReport(report: GDPRReport): Promise<void> {
        const reportsDir = path.join(process.cwd(), 'compliance-reports');
        await fs.mkdir(reportsDir, { recursive: true });

        const fileName = `${report.reportId}.json`;
        const filePath = path.join(reportsDir, fileName);

        await fs.writeFile(filePath, JSON.stringify(report, null, 2));
    }

    async getDataProcessingActivities(): Promise<{
        activities: Array<{
            name: string;
            purpose: string;
            legalBasis: string;
            dataTypes: string[];
            retention: string;
            recipients: string[];
        }>;
    }> {
        return {
            activities: [
                {
                    name: 'User Account Management',
                    purpose: 'Provide platform access and personalization',
                    legalBasis: 'Contract performance (GDPR Art. 6(1)(b))',
                    dataTypes: ['Email', 'Username', 'Profile information', 'Preferences'],
                    retention: 'Until account deletion or 3 years of inactivity',
                    recipients: ['Internal systems', 'Authentication service'],
                },
                {
                    name: 'Code Execution and Analysis',
                    purpose: 'Process and evaluate user code submissions',
                    legalBasis: 'Contract performance (GDPR Art. 6(1)(b))',
                    dataTypes: ['Code submissions', 'Execution results', 'Performance metrics'],
                    retention: 'Until account deletion or 5 years for educational purposes',
                    recipients: ['Code execution service', 'AI analysis service'],
                },
                {
                    name: 'Contest Management',
                    purpose: 'Organize and manage coding competitions',
                    legalBasis: 'Contract performance (GDPR Art. 6(1)(b))',
                    dataTypes: ['Contest submissions', 'Rankings', 'Performance data'],
                    retention: 'Permanently for historical records (anonymized after 2 years)',
                    recipients: ['Contest service', 'Analytics service'],
                },
                {
                    name: 'Analytics and Improvement',
                    purpose: 'Improve platform performance and user experience',
                    legalBasis: 'Consent (GDPR Art. 6(1)(a))',
                    dataTypes: ['Usage patterns', 'Performance metrics', 'Error logs'],
                    retention: '2 years (anonymized)',
                    recipients: ['Analytics service', 'Third-party analytics providers (anonymized)'],
                },
            ],
        };
    }
}