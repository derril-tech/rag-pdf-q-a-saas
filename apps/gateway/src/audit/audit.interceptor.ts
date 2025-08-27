import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { AUDIT_METADATA_KEY, AuditMetadata } from './audit.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
    constructor(
        private readonly auditService: AuditService,
        private readonly reflector: Reflector,
    ) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const auditMetadata = this.reflector.get<AuditMetadata>(
            AUDIT_METADATA_KEY,
            context.getHandler(),
        );

        if (!auditMetadata) {
            return next.handle();
        }

        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        const startTime = Date.now();

        return next.handle().pipe(
            tap({
                next: (data) => {
                    this.logAuditEvent(
                        context,
                        auditMetadata,
                        'success',
                        data,
                        startTime,
                    );
                },
                error: (error) => {
                    this.logAuditEvent(
                        context,
                        auditMetadata,
                        'failure',
                        error,
                        startTime,
                    );
                },
            }),
        );
    }

    private async logAuditEvent(
        context: ExecutionContext,
        metadata: AuditMetadata,
        outcome: 'success' | 'failure',
        data: any,
        startTime: number,
    ): Promise<void> {
        try {
            const request = context.switchToHttp().getRequest();
            const response = context.switchToHttp().getResponse();

            const organizationId = request.user?.organizationId;
            const userId = metadata.captureUser ? request.user?.id : undefined;
            const ipAddress = metadata.captureIp ? request.ip : undefined;
            const userAgent = request.get('User-Agent');

            const details: Record<string, any> = {
                method: request.method,
                path: request.path,
                statusCode: response.statusCode,
                duration: Date.now() - startTime,
            };

            // Capture request data if configured
            if (metadata.captureRequest) {
                details.requestBody = this.sanitizeRequestData(request.body);
                details.requestParams = request.params;
                details.requestQuery = request.query;
            }

            // Capture response data if configured
            if (metadata.captureResponse && outcome === 'success') {
                details.responseData = this.sanitizeResponseData(data);
            }

            // Add error details if failure
            if (outcome === 'failure') {
                details.error = {
                    message: data.message,
                    code: data.statusCode || data.code,
                    stack: process.env.NODE_ENV === 'development' ? data.stack : undefined,
                };
            }

            await this.auditService.logEvent({
                organizationId,
                userId,
                action: metadata.action,
                resource: metadata.resource,
                details,
                ipAddress,
                userAgent,
                sessionId: request.session?.id,
                severity: metadata.severity || 'low',
                outcome,
            });
        } catch (error) {
            // Don't throw - audit logging should not break main functionality
            console.error('Failed to log audit event:', error);
        }
    }

    private sanitizeRequestData(data: any): any {
        if (!data) return data;

        const sanitized = { ...data };

        // Remove sensitive fields
        const sensitiveFields = [
            'password',
            'token',
            'apiKey',
            'secret',
            'key',
            'authorization',
            'cookie',
        ];

        for (const field of sensitiveFields) {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        }

        return sanitized;
    }

    private sanitizeResponseData(data: any): any {
        if (!data) return data;

        // For large responses, just capture metadata
        if (typeof data === 'object' && data !== null) {
            if (Array.isArray(data)) {
                return {
                    type: 'array',
                    length: data.length,
                    sample: data.slice(0, 3), // First 3 items
                };
            } else {
                const keys = Object.keys(data);
                if (keys.length > 10) {
                    return {
                        type: 'object',
                        keys: keys.slice(0, 10), // First 10 keys
                        totalKeys: keys.length,
                    };
                }
            }
        }

        return data;
    }
}
