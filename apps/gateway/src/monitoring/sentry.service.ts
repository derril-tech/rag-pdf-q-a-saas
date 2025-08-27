import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

export interface SentryConfig {
    dsn: string;
    environment: string;
    release: string;
    tracesSampleRate: number;
    profilesSampleRate: number;
    enableTracing: boolean;
    enableProfiling: boolean;
    beforeSend?: (event: Sentry.Event, hint: Sentry.EventHint) => Sentry.Event | null;
    beforeBreadcrumb?: (breadcrumb: Sentry.Breadcrumb, hint: Sentry.BreadcrumbHint) => Sentry.Breadcrumb | null;
}

@Injectable()
export class SentryService implements OnModuleInit {
    private readonly logger = new Logger(SentryService.name);
    private isInitialized = false;

    constructor(private configService: ConfigService) { }

    async onModuleInit() {
        await this.initializeSentry();
    }

    /**
     * Initialize Sentry
     */
    private async initializeSentry() {
        try {
            const dsn = this.configService.get<string>('SENTRY_DSN');
            const environment = this.configService.get<string>('NODE_ENV', 'development');
            const release = this.configService.get<string>('APP_VERSION', '1.0.0');
            const tracesSampleRate = this.configService.get<number>('SENTRY_TRACES_SAMPLE_RATE', 0.1);
            const profilesSampleRate = this.configService.get<number>('SENTRY_PROFILES_SAMPLE_RATE', 0.1);
            const enableTracing = this.configService.get<boolean>('SENTRY_ENABLE_TRACING', true);
            const enableProfiling = this.configService.get<boolean>('SENTRY_ENABLE_PROFILING', true);

            if (!dsn) {
                this.logger.warn('SENTRY_DSN not configured, Sentry will not be initialized');
                return;
            }

            const config: SentryConfig = {
                dsn,
                environment,
                release,
                tracesSampleRate,
                profilesSampleRate,
                enableTracing,
                enableProfiling,
                beforeSend: this.beforeSend.bind(this),
                beforeBreadcrumb: this.beforeBreadcrumb.bind(this),
            };

            Sentry.init({
                dsn: config.dsn,
                environment: config.environment,
                release: config.release,
                tracesSampleRate: config.tracesSampleRate,
                profilesSampleRate: config.profilesSampleRate,
                integrations: [
                    new Sentry.Integrations.Http({ tracing: config.enableTracing }),
                    new Sentry.Integrations.Express({ app: undefined }),
                    new Sentry.Integrations.OnUncaughtException(),
                    new Sentry.Integrations.OnUnhandledRejection(),
                    ...(config.enableProfiling ? [new ProfilingIntegration()] : []),
                ],
                beforeSend: config.beforeSend,
                beforeBreadcrumb: config.beforeBreadcrumb,
            });

            this.isInitialized = true;
            this.logger.log('Sentry initialized successfully');
        } catch (error) {
            this.logger.error(`Failed to initialize Sentry: ${error.message}`);
        }
    }

    /**
     * Filter sensitive data before sending to Sentry
     */
    private beforeSend(event: Sentry.Event, hint: Sentry.EventHint): Sentry.Event | null {
        try {
            // Remove sensitive data from event
            if (event.request?.headers) {
                const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
                sensitiveHeaders.forEach(header => {
                    if (event.request!.headers![header]) {
                        event.request!.headers![header] = '[REDACTED]';
                    }
                });
            }

            // Remove sensitive data from extra context
            if (event.extra) {
                const sensitiveKeys = ['password', 'token', 'secret', 'key', 'api_key'];
                sensitiveKeys.forEach(key => {
                    if (event.extra![key]) {
                        event.extra![key] = '[REDACTED]';
                    }
                });
            }

            // Add custom context
            event.tags = {
                ...event.tags,
                service: 'rag-gateway',
                component: 'api',
            };

            return event;
        } catch (error) {
            this.logger.error(`Error in beforeSend: ${error.message}`);
            return event;
        }
    }

    /**
     * Filter sensitive data from breadcrumbs
     */
    private beforeBreadcrumb(breadcrumb: Sentry.Breadcrumb, hint: Sentry.BreadcrumbHint): Sentry.Breadcrumb | null {
        try {
            // Remove sensitive data from breadcrumb data
            if (breadcrumb.data) {
                const sensitiveKeys = ['password', 'token', 'secret', 'key', 'api_key'];
                sensitiveKeys.forEach(key => {
                    if (breadcrumb.data![key]) {
                        breadcrumb.data![key] = '[REDACTED]';
                    }
                });
            }

            return breadcrumb;
        } catch (error) {
            this.logger.error(`Error in beforeBreadcrumb: ${error.message}`);
            return breadcrumb;
        }
    }

    /**
     * Capture an exception
     */
    captureException(exception: Error, context?: Record<string, any>): string {
        if (!this.isInitialized) {
            this.logger.error(`Exception not captured (Sentry not initialized): ${exception.message}`);
            return '';
        }

        try {
            const eventId = Sentry.captureException(exception, {
                extra: context,
                tags: {
                    service: 'rag-gateway',
                    component: 'api',
                },
            });

            this.logger.error(`Exception captured in Sentry: ${eventId}`);
            return eventId;
        } catch (error) {
            this.logger.error(`Failed to capture exception: ${error.message}`);
            return '';
        }
    }

    /**
     * Capture a message
     */
    captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>): string {
        if (!this.isInitialized) {
            this.logger.log(`Message not captured (Sentry not initialized): ${message}`);
            return '';
        }

        try {
            const eventId = Sentry.captureMessage(message, {
                level,
                extra: context,
                tags: {
                    service: 'rag-gateway',
                    component: 'api',
                },
            });

            this.logger.log(`Message captured in Sentry: ${eventId}`);
            return eventId;
        } catch (error) {
            this.logger.error(`Failed to capture message: ${error.message}`);
            return '';
        }
    }

    /**
     * Add breadcrumb
     */
    addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
        if (!this.isInitialized) {
            return;
        }

        try {
            Sentry.addBreadcrumb({
                ...breadcrumb,
                category: breadcrumb.category || 'rag-gateway',
            });
        } catch (error) {
            this.logger.error(`Failed to add breadcrumb: ${error.message}`);
        }
    }

    /**
     * Set user context
     */
    setUser(user: Sentry.User): void {
        if (!this.isInitialized) {
            return;
        }

        try {
            Sentry.setUser(user);
        } catch (error) {
            this.logger.error(`Failed to set user: ${error.message}`);
        }
    }

    /**
     * Set extra context
     */
    setExtra(key: string, value: any): void {
        if (!this.isInitialized) {
            return;
        }

        try {
            Sentry.setExtra(key, value);
        } catch (error) {
            this.logger.error(`Failed to set extra: ${error.message}`);
        }
    }

    /**
     * Set tag
     */
    setTag(key: string, value: string): void {
        if (!this.isInitialized) {
            return;
        }

        try {
            Sentry.setTag(key, value);
        } catch (error) {
            this.logger.error(`Failed to set tag: ${error.message}`);
        }
    }

    /**
     * Start a transaction
     */
    startTransaction(name: string, operation: string): Sentry.Transaction {
        if (!this.isInitialized) {
            // Return a dummy transaction if Sentry is not initialized
            return {
                finish: () => { },
                setTag: () => { },
                setData: () => { },
                setStatus: () => { },
                setHttpStatus: () => { },
                setMeasurement: () => { },
                updateName: () => { },
                getSpan: () => undefined,
                startChild: () => ({
                    finish: () => { },
                    setTag: () => { },
                    setData: () => { },
                    setStatus: () => { },
                }),
            } as any;
        }

        try {
            return Sentry.startTransaction({
                name,
                op: operation,
            });
        } catch (error) {
            this.logger.error(`Failed to start transaction: ${error.message}`);
            return {} as any;
        }
    }

    /**
     * Get current transaction
     */
    getCurrentTransaction(): Sentry.Transaction | undefined {
        if (!this.isInitialized) {
            return undefined;
        }

        try {
            return Sentry.getCurrentHub().getScope()?.getTransaction();
        } catch (error) {
            this.logger.error(`Failed to get current transaction: ${error.message}`);
            return undefined;
        }
    }

    /**
     * Configure scope
     */
    configureScope(callback: (scope: Sentry.Scope) => void): void {
        if (!this.isInitialized) {
            return;
        }

        try {
            Sentry.configureScope(callback);
        } catch (error) {
            this.logger.error(`Failed to configure scope: ${error.message}`);
        }
    }

    /**
     * Flush events
     */
    async flush(timeout?: number): Promise<boolean> {
        if (!this.isInitialized) {
            return true;
        }

        try {
            return await Sentry.flush(timeout);
        } catch (error) {
            this.logger.error(`Failed to flush Sentry: ${error.message}`);
            return false;
        }
    }

    /**
     * Close Sentry
     */
    async close(): Promise<void> {
        if (!this.isInitialized) {
            return;
        }

        try {
            await Sentry.close();
            this.isInitialized = false;
            this.logger.log('Sentry closed successfully');
        } catch (error) {
            this.logger.error(`Failed to close Sentry: ${error.message}`);
        }
    }

    /**
     * Check if Sentry is initialized
     */
    isEnabled(): boolean {
        return this.isInitialized;
    }
}
