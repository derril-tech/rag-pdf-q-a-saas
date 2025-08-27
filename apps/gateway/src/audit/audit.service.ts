import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AuditEvent {
    id: string;
    timestamp: Date;
    organizationId: string;
    userId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    details: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    outcome: 'success' | 'failure' | 'partial';
    metadata?: Record<string, any>;
}

export interface AuditQuery {
    organizationId?: string;
    userId?: string;
    action?: string;
    resource?: string;
    severity?: AuditEvent['severity'];
    outcome?: AuditEvent['outcome'];
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}

@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    constructor(private configService: ConfigService) { }

    /**
     * Log an audit event
     */
    async logEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void> {
        try {
            const auditEvent: AuditEvent = {
                ...event,
                id: this.generateEventId(),
                timestamp: new Date(),
            };

            // Store in database
            await this.storeAuditEvent(auditEvent);

            // Log to console for development
            if (this.configService.get('NODE_ENV') === 'development') {
                this.logger.log(`AUDIT: ${auditEvent.action} on ${auditEvent.resource} by ${auditEvent.userId || 'system'}`);
            }

            // Send to external audit system if configured
            await this.sendToExternalAudit(auditEvent);

        } catch (error) {
            this.logger.error(`Failed to log audit event: ${error.message}`);
            // Don't throw - audit logging should not break main functionality
        }
    }

    /**
     * Log user authentication events
     */
    async logAuthEvent(
        organizationId: string,
        userId: string,
        action: 'login' | 'logout' | 'login_failed' | 'password_reset' | 'mfa_enabled' | 'mfa_disabled',
        outcome: AuditEvent['outcome'],
        details: Record<string, any> = {},
        ipAddress?: string,
        userAgent?: string
    ): Promise<void> {
        await this.logEvent({
            organizationId,
            userId,
            action,
            resource: 'auth',
            details,
            ipAddress,
            userAgent,
            severity: action === 'login_failed' ? 'medium' : 'low',
            outcome,
        });
    }

    /**
     * Log document-related events
     */
    async logDocumentEvent(
        organizationId: string,
        userId: string,
        action: 'upload' | 'delete' | 'update' | 'download' | 'process' | 'export',
        documentId: string,
        outcome: AuditEvent['outcome'],
        details: Record<string, any> = {},
        ipAddress?: string
    ): Promise<void> {
        await this.logEvent({
            organizationId,
            userId,
            action,
            resource: 'document',
            resourceId: documentId,
            details,
            ipAddress,
            severity: action === 'delete' ? 'high' : 'medium',
            outcome,
        });
    }

    /**
     * Log thread/chat events
     */
    async logThreadEvent(
        organizationId: string,
        userId: string,
        action: 'create' | 'delete' | 'message_sent' | 'export',
        threadId: string,
        outcome: AuditEvent['outcome'],
        details: Record<string, any> = {},
        ipAddress?: string
    ): Promise<void> {
        await this.logEvent({
            organizationId,
            userId,
            action,
            resource: 'thread',
            resourceId: threadId,
            details,
            ipAddress,
            severity: action === 'delete' ? 'medium' : 'low',
            outcome,
        });
    }

    /**
     * Log billing/subscription events
     */
    async logBillingEvent(
        organizationId: string,
        userId: string,
        action: 'subscription_created' | 'subscription_updated' | 'subscription_cancelled' | 'payment_succeeded' | 'payment_failed' | 'plan_changed',
        outcome: AuditEvent['outcome'],
        details: Record<string, any> = {},
        ipAddress?: string
    ): Promise<void> {
        await this.logEvent({
            organizationId,
            userId,
            action,
            resource: 'billing',
            details,
            ipAddress,
            severity: 'high',
            outcome,
        });
    }

    /**
     * Log API access events
     */
    async logApiEvent(
        organizationId: string,
        userId: string,
        action: 'api_call' | 'rate_limit_exceeded' | 'quota_exceeded',
        resource: string,
        outcome: AuditEvent['outcome'],
        details: Record<string, any> = {},
        ipAddress?: string,
        userAgent?: string
    ): Promise<void> {
        await this.logEvent({
            organizationId,
            userId,
            action,
            resource: `api:${resource}`,
            details,
            ipAddress,
            userAgent,
            severity: action === 'rate_limit_exceeded' ? 'medium' : 'low',
            outcome,
        });
    }

    /**
     * Log security events
     */
    async logSecurityEvent(
        organizationId: string,
        userId: string,
        action: 'permission_denied' | 'suspicious_activity' | 'data_access' | 'config_change',
        resource: string,
        outcome: AuditEvent['outcome'],
        details: Record<string, any> = {},
        ipAddress?: string
    ): Promise<void> {
        await this.logEvent({
            organizationId,
            userId,
            action,
            resource,
            details,
            ipAddress,
            severity: 'high',
            outcome,
        });
    }

    /**
     * Log integration events
     */
    async logIntegrationEvent(
        organizationId: string,
        userId: string,
        action: 'slack_connected' | 'slack_disconnected' | 'webhook_received' | 'sync_failed',
        resource: string,
        outcome: AuditEvent['outcome'],
        details: Record<string, any> = {},
        ipAddress?: string
    ): Promise<void> {
        await this.logEvent({
            organizationId,
            userId,
            action,
            resource: `integration:${resource}`,
            details,
            ipAddress,
            severity: 'medium',
            outcome,
        });
    }

    /**
     * Log data retention events
     */
    async logRetentionEvent(
        organizationId: string,
        action: 'document_purged' | 'retention_sweep' | 'data_exported',
        resource: string,
        outcome: AuditEvent['outcome'],
        details: Record<string, any> = {}
    ): Promise<void> {
        await this.logEvent({
            organizationId,
            action,
            resource: `retention:${resource}`,
            details,
            severity: 'high',
            outcome,
        });
    }

    /**
     * Query audit events
     */
    async queryEvents(query: AuditQuery): Promise<{
        events: AuditEvent[];
        total: number;
        hasMore: boolean;
    }> {
        try {
            // This would query the audit log database
            // For now, return mock data
            const events: AuditEvent[] = [];
            const total = 0;
            const hasMore = false;

            return { events, total, hasMore };
        } catch (error) {
            this.logger.error(`Failed to query audit events: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get audit statistics
     */
    async getAuditStats(
        organizationId: string,
        startDate: Date,
        endDate: Date
    ): Promise<{
        totalEvents: number;
        eventsByAction: Record<string, number>;
        eventsBySeverity: Record<string, number>;
        eventsByOutcome: Record<string, number>;
        topUsers: Array<{ userId: string; eventCount: number }>;
    }> {
        try {
            // This would aggregate audit statistics from the database
            // For now, return mock data
            return {
                totalEvents: 0,
                eventsByAction: {},
                eventsBySeverity: {},
                eventsByOutcome: {},
                topUsers: [],
            };
        } catch (error) {
            this.logger.error(`Failed to get audit stats: ${error.message}`);
            throw error;
        }
    }

    /**
     * Export audit logs
     */
    async exportAuditLogs(
        organizationId: string,
        startDate: Date,
        endDate: Date,
        format: 'csv' | 'json' = 'csv'
    ): Promise<{
        downloadUrl: string;
        expiresAt: Date;
    }> {
        try {
            // This would generate an audit log export
            // For now, return mock data
            return {
                downloadUrl: 'https://example.com/audit-export.csv',
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            };
        } catch (error) {
            this.logger.error(`Failed to export audit logs: ${error.message}`);
            throw error;
        }
    }

    /**
     * Check for suspicious activity
     */
    async detectSuspiciousActivity(organizationId: string, userId: string): Promise<{
        suspicious: boolean;
        reasons: string[];
        riskScore: number;
    }> {
        try {
            // This would analyze recent audit events for suspicious patterns
            // For now, return mock data
            return {
                suspicious: false,
                reasons: [],
                riskScore: 0,
            };
        } catch (error) {
            this.logger.error(`Failed to detect suspicious activity: ${error.message}`);
            throw error;
        }
    }

    /**
     * Store audit event in database
     */
    private async storeAuditEvent(event: AuditEvent): Promise<void> {
        try {
            // This would store the event in the audit log database
            // Implementation depends on your database setup

            const query = `
        INSERT INTO audit_logs (
          id, timestamp, organization_id, user_id, action, resource, 
          resource_id, details, ip_address, user_agent, session_id, 
          severity, outcome, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `;

            const values = [
                event.id,
                event.timestamp,
                event.organizationId,
                event.userId,
                event.action,
                event.resource,
                event.resourceId,
                JSON.stringify(event.details),
                event.ipAddress,
                event.userAgent,
                event.sessionId,
                event.severity,
                event.outcome,
                event.metadata ? JSON.stringify(event.metadata) : null,
            ];

            // Execute query (implementation depends on your database service)
            // await this.dbService.execute(query, values);

        } catch (error) {
            this.logger.error(`Failed to store audit event: ${error.message}`);
            throw error;
        }
    }

    /**
     * Send audit event to external audit system
     */
    private async sendToExternalAudit(event: AuditEvent): Promise<void> {
        try {
            const externalAuditUrl = this.configService.get('EXTERNAL_AUDIT_URL');
            if (!externalAuditUrl) {
                return; // No external audit system configured
            }

            // Send to external audit system
            const response = await fetch(externalAuditUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.configService.get('EXTERNAL_AUDIT_TOKEN')}`,
                },
                body: JSON.stringify(event),
            });

            if (!response.ok) {
                throw new Error(`External audit system returned ${response.status}`);
            }

        } catch (error) {
            this.logger.error(`Failed to send to external audit: ${error.message}`);
            // Don't throw - external audit failure should not break main functionality
        }
    }

    /**
     * Generate unique event ID
     */
    private generateEventId(): string {
        return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Create audit middleware for automatic logging
     */
    createAuditMiddleware() {
        return (req: any, res: any, next: any) => {
            const originalSend = res.send;

            res.send = function (data: any) {
                // Log the request after it's completed
                this.logRequest(req, res, data);
                return originalSend.call(this, data);
            }.bind(this);

            next();
        };
    }

    /**
     * Log HTTP request
     */
    private async logRequest(req: any, res: any, responseData: any): Promise<void> {
        try {
            const organizationId = req.user?.organizationId;
            const userId = req.user?.id;
            const action = `${req.method} ${req.route?.path || req.path}`;
            const outcome = res.statusCode < 400 ? 'success' : 'failure';
            const severity = res.statusCode >= 500 ? 'high' : 'low';

            await this.logEvent({
                organizationId,
                userId,
                action,
                resource: 'http_request',
                details: {
                    method: req.method,
                    path: req.path,
                    statusCode: res.statusCode,
                    responseSize: responseData?.length || 0,
                    duration: Date.now() - req.startTime,
                },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                sessionId: req.session?.id,
                severity,
                outcome,
            });

        } catch (error) {
            this.logger.error(`Failed to log HTTP request: ${error.message}`);
        }
    }
}
