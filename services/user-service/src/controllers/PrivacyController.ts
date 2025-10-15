import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { PrivacyService, ConsentRequest, ExportRequest, DeletionRequest } from '../services/PrivacyService';
import { DataAnonymizationService } from '../services/DataAnonymizationService';
import { AuditService } from '../services/AuditService';
import { ConsentType, ConsentStatus, ExportFormat, DeletionType } from '../entities';
import { HTTP_STATUS } from '@ai-platform/common';
import Joi from 'joi';
import * as fs from 'fs/promises';
import * as path from 'path';

export class PrivacyController {
    private privacyService: PrivacyService;
    private anonymizationService: DataAnonymizationService;
    private auditService: AuditService;

    constructor() {
        this.privacyService = new PrivacyService();
        this.anonymizationService = new DataAnonymizationService();
        this.auditService = new AuditService();
    }

    // Consent Management
    recordConsent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const schema = Joi.object({
                consentType: Joi.string().valid(...Object.values(ConsentType)).required(),
                consentStatus: Joi.string().valid(...Object.values(ConsentStatus)).required(),
                consentVersion: Joi.string().required(),
                consentText: Joi.string().required(),
            });

            const { error, value } = schema.validate(req.body);
            if (error) {
                res.status(HTTP_STATUS.BAD_REQUEST).json({
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: error.details[0].message,
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }

            const consentRequest: ConsentRequest = {
                userId: req.user!.id,
                consentType: value.consentType,
                consentStatus: value.consentStatus,
                consentVersion: value.consentVersion,
                consentText: value.consentText,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
            };

            const consent = await this.privacyService.recordConsent(consentRequest);

            res.status(HTTP_STATUS.CREATED).json({
                success: true,
                data: consent,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Error recording consent:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                error: {
                    code: 'CONSENT_RECORDING_FAILED',
                    message: 'Failed to record consent',
                    timestamp: new Date().toISOString(),
                },
            });
        }
    };

    getUserConsents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const consents = await this.privacyService.getUserConsents(req.user!.id);

            await this.auditService.logDataAccess(
                req.user!.id,
                'privacy_consent',
                'user_consents',
                req.ip,
                req.get('User-Agent')
            );

            res.json({
                success: true,
                data: consents,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Error fetching user consents:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                error: {
                    code: 'CONSENT_FETCH_FAILED',
                    message: 'Failed to fetch user consents',
                    timestamp: new Date().toISOString(),
                },
            });
        }
    };

    withdrawConsent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const schema = Joi.object({
                consentType: Joi.string().valid(...Object.values(ConsentType)).required(),
            });

            const { error, value } = schema.validate(req.body);
            if (error) {
                res.status(HTTP_STATUS.BAD_REQUEST).json({
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: error.details[0].message,
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }

            const consent = await this.privacyService.withdrawConsent(
                req.user!.id,
                value.consentType,
                req.ip,
                req.get('User-Agent')
            );

            res.json({
                success: true,
                data: consent,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Error withdrawing consent:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                error: {
                    code: 'CONSENT_WITHDRAWAL_FAILED',
                    message: error instanceof Error ? error.message : 'Failed to withdraw consent',
                    timestamp: new Date().toISOString(),
                },
            });
        }
    };

    // Data Export (GDPR Article 20)
    requestDataExport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const schema = Joi.object({
                format: Joi.string().valid(...Object.values(ExportFormat)).default(ExportFormat.JSON),
                dataTypes: Joi.array().items(Joi.string()).default(['user', 'consents']),
            });

            const { error, value } = schema.validate(req.body);
            if (error) {
                res.status(HTTP_STATUS.BAD_REQUEST).json({
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: error.details[0].message,
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }

            const exportRequest: ExportRequest = {
                userId: req.user!.id,
                format: value.format,
                dataTypes: value.dataTypes,
            };

            const request = await this.privacyService.requestDataExport(exportRequest);

            res.status(HTTP_STATUS.CREATED).json({
                success: true,
                data: {
                    requestId: request.id,
                    status: request.status,
                    format: request.format,
                    dataTypes: request.dataTypes,
                    expiresAt: request.expiresAt,
                },
                message: 'Data export request created. You will be notified when the export is ready.',
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Error requesting data export:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                error: {
                    code: 'EXPORT_REQUEST_FAILED',
                    message: 'Failed to create data export request',
                    timestamp: new Date().toISOString(),
                },
            });
        }
    };

    getExportRequests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const requests = await this.privacyService.getUserExportRequests(req.user!.id);

            await this.auditService.logDataAccess(
                req.user!.id,
                'data_export_request',
                'user_export_requests',
                req.ip,
                req.get('User-Agent')
            );

            res.json({
                success: true,
                data: requests,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Error fetching export requests:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                error: {
                    code: 'EXPORT_REQUESTS_FETCH_FAILED',
                    message: 'Failed to fetch export requests',
                    timestamp: new Date().toISOString(),
                },
            });
        }
    };

    downloadExport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const { requestId } = req.params;

            const exportRequest = await this.privacyService.getExportRequest(requestId);

            if (!exportRequest) {
                res.status(HTTP_STATUS.NOT_FOUND).json({
                    error: {
                        code: 'EXPORT_REQUEST_NOT_FOUND',
                        message: 'Export request not found',
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }

            if (exportRequest.userId !== req.user!.id) {
                res.status(HTTP_STATUS.FORBIDDEN).json({
                    error: {
                        code: 'ACCESS_DENIED',
                        message: 'Access denied to this export request',
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }

            if (exportRequest.status !== 'completed' || !exportRequest.filePath) {
                res.status(HTTP_STATUS.BAD_REQUEST).json({
                    error: {
                        code: 'EXPORT_NOT_READY',
                        message: 'Export is not ready for download',
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }

            if (new Date() > exportRequest.expiresAt) {
                res.status(410).json({
                    error: {
                        code: 'EXPORT_EXPIRED',
                        message: 'Export has expired',
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }

            // Check if file exists
            try {
                await fs.access(exportRequest.filePath);
            } catch {
                res.status(HTTP_STATUS.NOT_FOUND).json({
                    error: {
                        code: 'EXPORT_FILE_NOT_FOUND',
                        message: 'Export file not found',
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }

            await this.auditService.logDataAccess(
                req.user!.id,
                'data_export_download',
                requestId,
                req.ip,
                req.get('User-Agent')
            );

            const fileName = `user_data_export_${requestId}.${exportRequest.format}`;

            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader('Content-Type', this.getContentType(exportRequest.format));

            const fileBuffer = await fs.readFile(exportRequest.filePath);
            res.send(fileBuffer);
        } catch (error) {
            console.error('Error downloading export:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                error: {
                    code: 'EXPORT_DOWNLOAD_FAILED',
                    message: 'Failed to download export',
                    timestamp: new Date().toISOString(),
                },
            });
        }
    };

    // Data Deletion (GDPR Article 17)
    requestDataDeletion = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const schema = Joi.object({
                deletionType: Joi.string().valid(...Object.values(DeletionType)).default(DeletionType.FULL_ACCOUNT),
                dataTypes: Joi.array().items(Joi.string()).optional(),
                reason: Joi.string().optional(),
            });

            const { error, value } = schema.validate(req.body);
            if (error) {
                res.status(HTTP_STATUS.BAD_REQUEST).json({
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: error.details[0].message,
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }

            const deletionRequest: DeletionRequest = {
                userId: req.user!.id,
                deletionType: value.deletionType,
                dataTypes: value.dataTypes,
                reason: value.reason,
            };

            const request = await this.privacyService.requestDataDeletion(deletionRequest);

            res.status(HTTP_STATUS.CREATED).json({
                success: true,
                data: {
                    requestId: request.id,
                    status: request.status,
                    deletionType: request.deletionType,
                    scheduledFor: request.scheduledFor,
                    verificationCode: request.verificationCode,
                },
                message: 'Data deletion request created. Please verify using the provided code within 7 days.',
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Error requesting data deletion:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                error: {
                    code: 'DELETION_REQUEST_FAILED',
                    message: 'Failed to create data deletion request',
                    timestamp: new Date().toISOString(),
                },
            });
        }
    };

    verifyDataDeletion = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const { requestId } = req.params;
            const schema = Joi.object({
                verificationCode: Joi.string().required(),
            });

            const { error, value } = schema.validate(req.body);
            if (error) {
                res.status(HTTP_STATUS.BAD_REQUEST).json({
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: error.details[0].message,
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }

            const request = await this.privacyService.verifyDataDeletion(requestId, value.verificationCode);

            res.json({
                success: true,
                data: {
                    requestId: request.id,
                    status: request.status,
                    verifiedAt: request.verifiedAt,
                },
                message: 'Data deletion request verified and will be processed shortly.',
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Error verifying data deletion:', error);
            res.status(HTTP_STATUS.BAD_REQUEST).json({
                error: {
                    code: 'DELETION_VERIFICATION_FAILED',
                    message: error instanceof Error ? error.message : 'Failed to verify deletion request',
                    timestamp: new Date().toISOString(),
                },
            });
        }
    };

    getDeletionRequests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const requests = await this.privacyService.getUserDeletionRequests(req.user!.id);

            await this.auditService.logDataAccess(
                req.user!.id,
                'data_deletion_request',
                'user_deletion_requests',
                req.ip,
                req.get('User-Agent')
            );

            res.json({
                success: true,
                data: requests,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Error fetching deletion requests:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                error: {
                    code: 'DELETION_REQUESTS_FETCH_FAILED',
                    message: 'Failed to fetch deletion requests',
                    timestamp: new Date().toISOString(),
                },
            });
        }
    };

    // Audit and Compliance
    getAuditLogs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const schema = Joi.object({
                startDate: Joi.date().optional(),
                endDate: Joi.date().optional(),
                action: Joi.string().optional(),
                resourceType: Joi.string().optional(),
                limit: Joi.number().min(1).max(1000).default(100),
                offset: Joi.number().min(0).default(0),
            });

            const { error, value } = schema.validate(req.query);
            if (error) {
                res.status(HTTP_STATUS.BAD_REQUEST).json({
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: error.details[0].message,
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }

            const result = await this.auditService.getAuditLogs({
                userId: req.user!.id,
                startDate: value.startDate,
                endDate: value.endDate,
                action: value.action,
                resourceType: value.resourceType,
                limit: value.limit,
                offset: value.offset,
            });

            await this.auditService.logDataAccess(
                req.user!.id,
                'audit_log',
                'user_audit_logs',
                req.ip,
                req.get('User-Agent')
            );

            res.json({
                success: true,
                data: {
                    logs: result.logs,
                    total: result.total,
                    limit: value.limit,
                    offset: value.offset,
                },
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                error: {
                    code: 'AUDIT_LOGS_FETCH_FAILED',
                    message: 'Failed to fetch audit logs',
                    timestamp: new Date().toISOString(),
                },
            });
        }
    };

    generateComplianceReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const schema = Joi.object({
                startDate: Joi.date().required(),
                endDate: Joi.date().required(),
            });

            const { error, value } = schema.validate(req.query);
            if (error) {
                res.status(HTTP_STATUS.BAD_REQUEST).json({
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: error.details[0].message,
                        timestamp: new Date().toISOString(),
                    },
                });
                return;
            }

            const report = await this.auditService.generateComplianceReport(
                value.startDate,
                value.endDate,
                req.user!.id
            );

            await this.auditService.logDataAccess(
                req.user!.id,
                'compliance_report',
                'user_compliance_report',
                req.ip,
                req.get('User-Agent')
            );

            res.json({
                success: true,
                data: report,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Error generating compliance report:', error);
            res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
                error: {
                    code: 'COMPLIANCE_REPORT_FAILED',
                    message: 'Failed to generate compliance report',
                    timestamp: new Date().toISOString(),
                },
            });
        }
    };

    private getContentType(format: ExportFormat): string {
        switch (format) {
            case ExportFormat.JSON:
                return 'application/json';
            case ExportFormat.CSV:
                return 'text/csv';
            case ExportFormat.XML:
                return 'application/xml';
            default:
                return 'application/octet-stream';
        }
    }
}