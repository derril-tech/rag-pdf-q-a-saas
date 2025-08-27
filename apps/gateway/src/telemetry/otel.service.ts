import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';

export interface TraceContext {
    traceId: string;
    spanId: string;
    traceFlags: number;
}

export interface SpanOptions {
    name: string;
    kind?: SpanKind;
    attributes?: Record<string, any>;
    links?: any[];
}

@Injectable()
export class OTELService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(OTELService.name);
    private tracerProvider: NodeTracerProvider;
    private tracer: any;

    constructor(private configService: ConfigService) { }

    async onModuleInit() {
        await this.initializeOTEL();
    }

    async onModuleDestroy() {
        await this.shutdownOTEL();
    }

    /**
     * Initialize OpenTelemetry tracing
     */
    private async initializeOTEL() {
        try {
            const serviceName = this.configService.get<string>('OTEL_SERVICE_NAME', 'rag-gateway');
            const serviceVersion = this.configService.get<string>('OTEL_SERVICE_VERSION', '1.0.0');
            const environment = this.configService.get<string>('NODE_ENV', 'development');
            const otelEndpoint = this.configService.get<string>('OTEL_EXPORTER_OTLP_ENDPOINT');

            // Create tracer provider
            this.tracerProvider = new NodeTracerProvider({
                resource: new Resource({
                    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
                    [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
                    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
                }),
            });

            // Configure span processor
            if (otelEndpoint) {
                const exporter = new OTLPTraceExporter({
                    url: `${otelEndpoint}/v1/traces`,
                });
                this.tracerProvider.addSpanProcessor(new BatchSpanProcessor(exporter));
            }

            // Register instrumentations
            registerInstrumentations({
                instrumentations: [
                    new HttpInstrumentation(),
                    new ExpressInstrumentation(),
                    new NestInstrumentation(),
                ],
                tracerProvider: this.tracerProvider,
            });

            // Register the tracer provider
            this.tracerProvider.register();

            // Get tracer
            this.tracer = trace.getTracer(serviceName, serviceVersion);

            this.logger.log('OpenTelemetry tracing initialized successfully');
        } catch (error) {
            this.logger.error(`Failed to initialize OpenTelemetry: ${error.message}`);
        }
    }

    /**
     * Shutdown OpenTelemetry
     */
    private async shutdownOTEL() {
        try {
            if (this.tracerProvider) {
                await this.tracerProvider.shutdown();
                this.logger.log('OpenTelemetry tracing shutdown successfully');
            }
        } catch (error) {
            this.logger.error(`Failed to shutdown OpenTelemetry: ${error.message}`);
        }
    }

    /**
     * Create a new span
     */
    createSpan(options: SpanOptions): any {
        if (!this.tracer) {
            return null;
        }

        const span = this.tracer.startSpan(options.name, {
            kind: options.kind || SpanKind.INTERNAL,
            attributes: options.attributes || {},
            links: options.links || [],
        });

        return span;
    }

    /**
     * Start a new span and set it as active
     */
    startSpan(options: SpanOptions): any {
        const span = this.createSpan(options);
        if (span) {
            context.with(trace.setSpan(context.active(), span), () => {
                // Span is now active in this context
            });
        }
        return span;
    }

    /**
     * Get current active span
     */
    getActiveSpan(): any {
        return trace.getActiveSpan();
    }

    /**
     * Add event to current span
     */
    addEvent(name: string, attributes?: Record<string, any>): void {
        const span = this.getActiveSpan();
        if (span) {
            span.addEvent(name, attributes);
        }
    }

    /**
     * Add attributes to current span
     */
    setAttributes(attributes: Record<string, any>): void {
        const span = this.getActiveSpan();
        if (span) {
            span.setAttributes(attributes);
        }
    }

    /**
     * Mark current span as error
     */
    setError(error: Error): void {
        const span = this.getActiveSpan();
        if (span) {
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error.message,
            });
            span.recordException(error);
        }
    }

    /**
     * Mark current span as success
     */
    setSuccess(): void {
        const span = this.getActiveSpan();
        if (span) {
            span.setStatus({ code: SpanStatusCode.OK });
        }
    }

    /**
     * End current span
     */
    endSpan(): void {
        const span = this.getActiveSpan();
        if (span) {
            span.end();
        }
    }

    /**
     * Create a child span
     */
    createChildSpan(options: SpanOptions): any {
        const parentSpan = this.getActiveSpan();
        if (!parentSpan || !this.tracer) {
            return null;
        }

        const span = this.tracer.startSpan(options.name, {
            kind: options.kind || SpanKind.INTERNAL,
            attributes: options.attributes || {},
        }, trace.setSpan(context.active(), parentSpan));

        return span;
    }

    /**
     * Extract trace context from headers
     */
    extractTraceContext(headers: Record<string, string>): TraceContext | null {
        try {
            const traceparent = headers['traceparent'];
            if (!traceparent) {
                return null;
            }

            // Parse traceparent header (format: 00-<trace-id>-<span-id>-<trace-flags>)
            const parts = traceparent.split('-');
            if (parts.length !== 4) {
                return null;
            }

            return {
                traceId: parts[1],
                spanId: parts[2],
                traceFlags: parseInt(parts[3], 16),
            };
        } catch (error) {
            this.logger.warn(`Failed to extract trace context: ${error.message}`);
            return null;
        }
    }

    /**
     * Inject trace context into headers
     */
    injectTraceContext(headers: Record<string, string>): void {
        try {
            const span = this.getActiveSpan();
            if (!span) {
                return;
            }

            const spanContext = span.spanContext();
            const traceparent = `00-${spanContext.traceId}-${spanContext.spanId}-0${spanContext.traceFlags}`;
            headers['traceparent'] = traceparent;
        } catch (error) {
            this.logger.warn(`Failed to inject trace context: ${error.message}`);
        }
    }

    /**
     * Create a span for HTTP requests
     */
    createHttpSpan(method: string, url: string, statusCode?: number): any {
        return this.createSpan({
            name: `${method} ${url}`,
            kind: SpanKind.CLIENT,
            attributes: {
                'http.method': method,
                'http.url': url,
                ...(statusCode && { 'http.status_code': statusCode }),
            },
        });
    }

    /**
     * Create a span for database operations
     */
    createDbSpan(operation: string, table?: string, query?: string): any {
        return this.createSpan({
            name: `db.${operation}`,
            kind: SpanKind.CLIENT,
            attributes: {
                'db.operation': operation,
                ...(table && { 'db.table': table }),
                ...(query && { 'db.query': query }),
            },
        });
    }

    /**
     * Create a span for external service calls
     */
    createExternalSpan(service: string, operation: string, endpoint?: string): any {
        return this.createSpan({
            name: `${service}.${operation}`,
            kind: SpanKind.CLIENT,
            attributes: {
                'service.name': service,
                'service.operation': operation,
                ...(endpoint && { 'service.endpoint': endpoint }),
            },
        });
    }

    /**
     * Create a span for worker jobs
     */
    createWorkerSpan(jobType: string, jobId: string, organizationId?: string): any {
        return this.createSpan({
            name: `worker.${jobType}`,
            kind: SpanKind.CONSUMER,
            attributes: {
                'job.type': jobType,
                'job.id': jobId,
                ...(organizationId && { 'organization.id': organizationId }),
            },
        });
    }

    /**
     * Create a span for document processing
     */
    createDocumentSpan(operation: string, documentId: string, organizationId?: string): any {
        return this.createSpan({
            name: `document.${operation}`,
            kind: SpanKind.INTERNAL,
            attributes: {
                'document.operation': operation,
                'document.id': documentId,
                ...(organizationId && { 'organization.id': organizationId }),
            },
        });
    }

    /**
     * Create a span for chat/QA operations
     */
    createQASpan(operation: string, threadId?: string, organizationId?: string): any {
        return this.createSpan({
            name: `qa.${operation}`,
            kind: SpanKind.INTERNAL,
            attributes: {
                'qa.operation': operation,
                ...(threadId && { 'thread.id': threadId }),
                ...(organizationId && { 'organization.id': organizationId }),
            },
        });
    }

    /**
     * Get trace ID from current span
     */
    getCurrentTraceId(): string | null {
        const span = this.getActiveSpan();
        if (span) {
            return span.spanContext().traceId;
        }
        return null;
    }

    /**
     * Get span ID from current span
     */
    getCurrentSpanId(): string | null {
        const span = this.getActiveSpan();
        if (span) {
            return span.spanContext().spanId;
        }
        return null;
    }

    /**
     * Check if tracing is enabled
     */
    isEnabled(): boolean {
        return this.tracer !== undefined;
    }
}
