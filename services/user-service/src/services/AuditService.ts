import { Repository } from 'typeorm';
import { AppDataSource } from '../database/connection';
import { AuditLog, AuditAction, AuditResult } from '../entities';

export interface AuditLogRequest {
    userId?: string;
    sessionId?: string;
    action: AuditAction | string;
    resourceType: string;
    resourceId?: string;
    result?: AuditResult;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    metadata?: Record<string, any>;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    errorMessage?: string;
}

export interface AuditLogFilter {
    userId?: string;
    action?: AuditAction | string;
    resourceType?: string;
    resourceId?: string;
    result?: AuditResult;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}

export class AuditService {
    private auditLogRepository: Repository<AuditLog>;

    constructor() {
        this.auditLogRepository = AppDataSource.getRepository(AuditLog);
    }

    async log(request: AuditLogRequest): Promise<AuditLog> {
        const auditLog = this.auditLogRepository.create({
            userId: request.userId,
            sessionId: request.sessionId,
            action: request.action as AuditAction,
            resourceType: request.resourceType,
            resourceId: request.resourceId,
            result: request.result || AuditResult.SUCCESS,
            ipAddress: request.ipAddress,
            userAgent: request.userAgent,
            requestId: request.requestId,
            metadata: request.metadata,
            oldValues: request.oldValues,
            newValues: request.newValues,
            errorMessage: request.errorMessage,
        });

        return this.auditLogRepository.save(auditLog);
    }

    async getAuditLogs(filter: AuditLogFilter): Promise<{ logs: AuditLog[]; total: number }> {
        const queryBuilder = this.auditLogRepository.createQueryBuilder('audit');

        if (filter.userId) {
            queryBuilder.andWhere('audit.userId = :userId', { userId: filter.userId });
        }

        if (filter.action) {
            queryBuilder.andWhere('audit.action = :action', { action: filter.action });
        }

        if (filter.resourceType) {
            queryBuilder.andWhere('audit.resourceType = :resourceType', { resourceType: filter.resourceType });
        }

        if (filter.resourceId) {
            queryBuilder.andWhere('audit.resourceId = :resourceId', { resourceId: filter.resourceId });
        }

        if (filter.result) {
            queryBuilder.andWhere('audit.result = :result', { result: filter.result });
        }

        if (filter.startDate) {
            queryBuilder.andWhere('audit.createdAt >= :startDate', { startDate: filter.startDate });
        }

        if (filter.endDate) {
            queryBuilder.andWhere('audit.createdAt <= :endDate', { endDate: filter.endDate });
        }

        queryBuilder.orderBy('audit.createdAt', 'DESC');

        const total = await queryBuilder.getCount();

        if (filter.limit) {
            queryBuilder.limit(filter.limit);
        }

        if (filter.offset) {
            queryBuilder.offset(filter.offset);
        }

        const logs = await queryBuilder.getMany();

        return { logs, total };
    }

    async getUserAuditLogs(userId: string, limit: number = 100): Promise<AuditLog[]> {
        const result = await this.getAuditLogs({ userId, limit });
        return result.logs;
    }

    async getResourceAuditLogs(resourceType: string, resourceId: string): Promise<AuditLog[]> {
        const result = await this.getAuditLogs({ resourceType, resourceId });
        return result.logs;
    }

    async logUserAction(
        userId: string,
        action: AuditAction,
        resourceType: string,
        resourceId?: string,
        metadata?: Record<string, any>,
        ipAddress?: string,
        userAgent?: string,
        sessionId?: string
    ): Promise<AuditLog> {
        return this.log({
            userId,
            sessionId,
            action,
            resourceType,
            resourceId,
            metadata,
            ipAddress,
            userAgent,
        });
    }

    async logDataAccess(
        userId: string,
        resourceType: string,
        resourceId: string,
        ipAddress?: string,
        userAgent?: string,
        sessionId?: string
    ): Promise<AuditLog> {
        return this.logUserAction(
            userId,
            AuditAction.READ,
            resourceType,
            resourceId,
            undefined,
            ipAddress,
            userAgent,
            sessionId
        );
    }

    async logDataModification(
        userId: string,
        action: AuditAction.CREATE | AuditAction.UPDATE | AuditAction.DELETE,
        resourceType: string,
        resourceId: string,
        oldValues?: Record<string, any>,
        newValues?: Record<string, any>,
        ipAddress?: string,
        userAgent?: string,
        sessionId?: string
    ): Promise<AuditLog> {
        return this.log({
            userId,
            sessionId,
            action,
            resourceType,
            resourceId,
            oldValues,
            newValues,
            ipAddress,
            userAgent,
        });
    }

    async logAuthenticationEvent(
        userId: string,
        action: AuditAction.LOGIN | AuditAction.LOGOUT,
        result: AuditResult,
        ipAddress?: string,
        userAgent?: string,
        sessionId?: string,
        errorMessage?: string
    ): Promise<AuditLog> {
        return this.log({
            userId,
            sessionId,
            action,
            resourceType: 'authentication',
            result,
            ipAddress,
            userAgent,
            errorMessage,
        });
    }

    async logSecurityEvent(
        userId: string | undefined,
        action: string,
        resourceType: string,
        result: AuditResult,
        metadata?: Record<string, any>,
        ipAddress?: string,
        userAgent?: string,
        errorMessage?: string
    ): Promise<AuditLog> {
        return this.log({
            userId,
            action,
            resourceType,
            result,
            metadata,
            ipAddress,
            userAgent,
            errorMessage,
        });
    }

    // Compliance reporting methods
    async generateComplianceReport(
        startDate: Date,
        endDate: Date,
        userId?: string
    ): Promise<{
        summary: {
            totalEvents: number;
            successfulEvents: number;
            failedEvents: number;
            dataAccessEvents: number;
            dataModificationEvents: number;
            authenticationEvents: number;
        };
        events: AuditLog[];
    }> {
        const filter: AuditLogFilter = {
            startDate,
            endDate,
            userId,
        };

        const { logs: events, total: totalEvents } = await this.getAuditLogs(filter);

        const summary = {
            totalEvents,
            successfulEvents: events.filter(e => e.result === AuditResult.SUCCESS).length,
            failedEvents: events.filter(e => e.result === AuditResult.FAILURE).length,
            dataAccessEvents: events.filter(e => e.action === AuditAction.READ).length,
            dataModificationEvents: events.filter(e =>
                [AuditAction.CREATE, AuditAction.UPDATE, AuditAction.DELETE].includes(e.action)
            ).length,
            authenticationEvents: events.filter(e =>
                [AuditAction.LOGIN, AuditAction.LOGOUT].includes(e.action)
            ).length,
        };

        return { summary, events };
    }

    async getDataAccessReport(userId: string, startDate: Date, endDate: Date): Promise<AuditLog[]> {
        const result = await this.getAuditLogs({
            userId,
            action: AuditAction.READ,
            startDate,
            endDate,
        });

        return result.logs;
    }

    async getDataModificationReport(userId: string, startDate: Date, endDate: Date): Promise<AuditLog[]> {
        const queryBuilder = this.auditLogRepository.createQueryBuilder('audit');

        queryBuilder
            .where('audit.userId = :userId', { userId })
            .andWhere('audit.action IN (:...actions)', {
                actions: [AuditAction.CREATE, AuditAction.UPDATE, AuditAction.DELETE]
            })
            .andWhere('audit.createdAt >= :startDate', { startDate })
            .andWhere('audit.createdAt <= :endDate', { endDate })
            .orderBy('audit.createdAt', 'DESC');

        return queryBuilder.getMany();
    }

    // Cleanup old audit logs (for data retention compliance)
    async cleanupOldLogs(retentionDays: number = 2555): Promise<number> { // ~7 years default
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        const result = await this.auditLogRepository
            .createQueryBuilder()
            .delete()
            .where('createdAt < :cutoffDate', { cutoffDate })
            .execute();

        return result.affected || 0;
    }
}