import { SetMetadata } from '@nestjs/common';

export const AUDIT_METADATA_KEY = 'audit';

export interface AuditMetadata {
    action: string;
    resource: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    captureRequest?: boolean;
    captureResponse?: boolean;
    captureUser?: boolean;
    captureIp?: boolean;
}

/**
 * Decorator to mark methods for audit logging
 */
export const Audit = (metadata: AuditMetadata) => {
    return SetMetadata(AUDIT_METADATA_KEY, metadata);
};

/**
 * Decorator for authentication events
 */
export const AuditAuth = (action: AuditMetadata['action']) => {
    return Audit({
        action,
        resource: 'auth',
        severity: action === 'login_failed' ? 'medium' : 'low',
        captureUser: true,
        captureIp: true,
    });
};

/**
 * Decorator for document events
 */
export const AuditDocument = (action: AuditMetadata['action']) => {
    return Audit({
        action,
        resource: 'document',
        severity: action === 'delete' ? 'high' : 'medium',
        captureUser: true,
        captureIp: true,
    });
};

/**
 * Decorator for thread events
 */
export const AuditThread = (action: AuditMetadata['action']) => {
    return Audit({
        action,
        resource: 'thread',
        severity: action === 'delete' ? 'medium' : 'low',
        captureUser: true,
        captureIp: true,
    });
};

/**
 * Decorator for billing events
 */
export const AuditBilling = (action: AuditMetadata['action']) => {
    return Audit({
        action,
        resource: 'billing',
        severity: 'high',
        captureUser: true,
        captureIp: true,
    });
};

/**
 * Decorator for API events
 */
export const AuditApi = (action: AuditMetadata['action'], resource: string) => {
    return Audit({
        action,
        resource: `api:${resource}`,
        severity: action === 'rate_limit_exceeded' ? 'medium' : 'low',
        captureUser: true,
        captureIp: true,
        captureRequest: true,
    });
};

/**
 * Decorator for security events
 */
export const AuditSecurity = (action: AuditMetadata['action'], resource: string) => {
    return Audit({
        action,
        resource,
        severity: 'high',
        captureUser: true,
        captureIp: true,
        captureRequest: true,
    });
};

/**
 * Decorator for integration events
 */
export const AuditIntegration = (action: AuditMetadata['action'], resource: string) => {
    return Audit({
        action,
        resource: `integration:${resource}`,
        severity: 'medium',
        captureUser: true,
        captureIp: true,
    });
};

/**
 * Decorator for retention events
 */
export const AuditRetention = (action: AuditMetadata['action'], resource: string) => {
    return Audit({
        action,
        resource: `retention:${resource}`,
        severity: 'high',
        captureUser: false,
        captureIp: false,
    });
};
