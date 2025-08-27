import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

export interface MetricsLabels {
    organization_id?: string;
    project_id?: string;
    document_id?: string;
    thread_id?: string;
    worker_type?: string;
    model_name?: string;
    status?: string;
    error_type?: string;
}

@Injectable()
export class PrometheusService {
    private readonly logger = new Logger(PrometheusService.name);

    // Counters
    private readonly documentUploadsTotal = new Counter({
        name: 'rag_document_uploads_total',
        help: 'Total number of document uploads',
        labelNames: ['organization_id', 'project_id', 'status', 'error_type'],
    });

    private readonly documentProcessingTotal = new Counter({
        name: 'rag_document_processing_total',
        help: 'Total number of document processing jobs',
        labelNames: ['organization_id', 'project_id', 'worker_type', 'status', 'error_type'],
    });

    private readonly qaQueriesTotal = new Counter({
        name: 'rag_qa_queries_total',
        help: 'Total number of QA queries',
        labelNames: ['organization_id', 'project_id', 'thread_id', 'status', 'error_type'],
    });

    private readonly tokensUsedTotal = new Counter({
        name: 'rag_tokens_used_total',
        help: 'Total number of tokens used',
        labelNames: ['organization_id', 'project_id', 'model_name', 'operation'],
    });

    private readonly apiRequestsTotal = new Counter({
        name: 'rag_api_requests_total',
        help: 'Total number of API requests',
        labelNames: ['method', 'endpoint', 'status_code', 'organization_id'],
    });

    private readonly slackEventsTotal = new Counter({
        name: 'rag_slack_events_total',
        help: 'Total number of Slack events',
        labelNames: ['event_type', 'organization_id', 'status'],
    });

    private readonly exportJobsTotal = new Counter({
        name: 'rag_export_jobs_total',
        help: 'Total number of export jobs',
        labelNames: ['organization_id', 'project_id', 'format', 'status'],
    });

    private readonly retentionSweepsTotal = new Counter({
        name: 'rag_retention_sweeps_total',
        help: 'Total number of retention sweeps',
        labelNames: ['organization_id', 'status', 'documents_purged'],
    });

    // Histograms
    private readonly documentProcessingDuration = new Histogram({
        name: 'rag_document_processing_duration_seconds',
        help: 'Document processing duration in seconds',
        labelNames: ['organization_id', 'project_id', 'worker_type', 'status'],
        buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300],
    });

    private readonly qaQueryDuration = new Histogram({
        name: 'rag_qa_query_duration_seconds',
        help: 'QA query duration in seconds',
        labelNames: ['organization_id', 'project_id', 'thread_id', 'status'],
        buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
    });

    private readonly apiRequestDuration = new Histogram({
        name: 'rag_api_request_duration_seconds',
        help: 'API request duration in seconds',
        labelNames: ['method', 'endpoint', 'status_code'],
        buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
    });

    private readonly tokenGenerationDuration = new Histogram({
        name: 'rag_token_generation_duration_seconds',
        help: 'Token generation duration in seconds',
        labelNames: ['organization_id', 'project_id', 'model_name', 'operation'],
        buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
    });

    private readonly embeddingGenerationDuration = new Histogram({
        name: 'rag_embedding_generation_duration_seconds',
        help: 'Embedding generation duration in seconds',
        labelNames: ['organization_id', 'project_id', 'model_name', 'chunk_count'],
        buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
    });

    // Gauges
    private readonly activeDocuments = new Gauge({
        name: 'rag_active_documents',
        help: 'Number of active documents',
        labelNames: ['organization_id', 'project_id', 'status'],
    });

    private readonly activeThreads = new Gauge({
        name: 'rag_active_threads',
        help: 'Number of active threads',
        labelNames: ['organization_id', 'project_id'],
    });

    private readonly queueSize = new Gauge({
        name: 'rag_queue_size',
        help: 'Number of jobs in queue',
        labelNames: ['queue_name', 'organization_id'],
    });

    private readonly workerCount = new Gauge({
        name: 'rag_worker_count',
        help: 'Number of active workers',
        labelNames: ['worker_type', 'status'],
    });

    private readonly memoryUsage = new Gauge({
        name: 'rag_memory_usage_bytes',
        help: 'Memory usage in bytes',
        labelNames: ['service', 'type'],
    });

    private readonly cpuUsage = new Gauge({
        name: 'rag_cpu_usage_percent',
        help: 'CPU usage percentage',
        labelNames: ['service'],
    });

    constructor(private configService: ConfigService) {
        this.initializeMetrics();
    }

    /**
     * Initialize Prometheus metrics
     */
    private initializeMetrics() {
        try {
            // Collect default metrics (CPU, memory, etc.)
            collectDefaultMetrics({
                prefix: 'rag_',
                labels: {
                    service: this.configService.get<string>('SERVICE_NAME', 'rag-gateway'),
                },
            });

            this.logger.log('Prometheus metrics initialized successfully');
        } catch (error) {
            this.logger.error(`Failed to initialize Prometheus metrics: ${error.message}`);
        }
    }

    /**
     * Get metrics for Prometheus endpoint
     */
    async getMetrics(): Promise<string> {
        try {
            return await register.metrics();
        } catch (error) {
            this.logger.error(`Failed to get metrics: ${error.message}`);
            return '';
        }
    }

    /**
     * Record document upload
     */
    recordDocumentUpload(labels: MetricsLabels, status: string, errorType?: string) {
        this.documentUploadsTotal.inc({
            organization_id: labels.organization_id || 'unknown',
            project_id: labels.project_id || 'unknown',
            status,
            error_type: errorType || 'none',
        });
    }

    /**
     * Record document processing
     */
    recordDocumentProcessing(labels: MetricsLabels, status: string, errorType?: string) {
        this.documentProcessingTotal.inc({
            organization_id: labels.organization_id || 'unknown',
            project_id: labels.project_id || 'unknown',
            worker_type: labels.worker_type || 'unknown',
            status,
            error_type: errorType || 'none',
        });
    }

    /**
     * Record document processing duration
     */
    recordDocumentProcessingDuration(labels: MetricsLabels, duration: number, status: string) {
        this.documentProcessingDuration.observe(
            {
                organization_id: labels.organization_id || 'unknown',
                project_id: labels.project_id || 'unknown',
                worker_type: labels.worker_type || 'unknown',
                status,
            },
            duration,
        );
    }

    /**
     * Record QA query
     */
    recordQAQuery(labels: MetricsLabels, status: string, errorType?: string) {
        this.qaQueriesTotal.inc({
            organization_id: labels.organization_id || 'unknown',
            project_id: labels.project_id || 'unknown',
            thread_id: labels.thread_id || 'unknown',
            status,
            error_type: errorType || 'none',
        });
    }

    /**
     * Record QA query duration
     */
    recordQAQueryDuration(labels: MetricsLabels, duration: number, status: string) {
        this.qaQueryDuration.observe(
            {
                organization_id: labels.organization_id || 'unknown',
                project_id: labels.project_id || 'unknown',
                thread_id: labels.thread_id || 'unknown',
                status,
            },
            duration,
        );
    }

    /**
     * Record tokens used
     */
    recordTokensUsed(labels: MetricsLabels, tokenCount: number, operation: string) {
        this.tokensUsedTotal.inc(
            {
                organization_id: labels.organization_id || 'unknown',
                project_id: labels.project_id || 'unknown',
                model_name: labels.model_name || 'unknown',
                operation,
            },
            tokenCount,
        );
    }

    /**
     * Record token generation duration
     */
    recordTokenGenerationDuration(labels: MetricsLabels, duration: number, operation: string) {
        this.tokenGenerationDuration.observe(
            {
                organization_id: labels.organization_id || 'unknown',
                project_id: labels.project_id || 'unknown',
                model_name: labels.model_name || 'unknown',
                operation,
            },
            duration,
        );
    }

    /**
     * Record embedding generation duration
     */
    recordEmbeddingGenerationDuration(labels: MetricsLabels, duration: number, chunkCount: number) {
        this.embeddingGenerationDuration.observe(
            {
                organization_id: labels.organization_id || 'unknown',
                project_id: labels.project_id || 'unknown',
                model_name: labels.model_name || 'unknown',
                chunk_count: chunkCount.toString(),
            },
            duration,
        );
    }

    /**
     * Record API request
     */
    recordAPIRequest(method: string, endpoint: string, statusCode: number, organizationId?: string) {
        this.apiRequestsTotal.inc({
            method,
            endpoint,
            status_code: statusCode.toString(),
            organization_id: organizationId || 'unknown',
        });
    }

    /**
     * Record API request duration
     */
    recordAPIRequestDuration(method: string, endpoint: string, statusCode: number, duration: number) {
        this.apiRequestDuration.observe(
            {
                method,
                endpoint,
                status_code: statusCode.toString(),
            },
            duration,
        );
    }

    /**
     * Record Slack event
     */
    recordSlackEvent(eventType: string, organizationId?: string, status: string = 'success') {
        this.slackEventsTotal.inc({
            event_type: eventType,
            organization_id: organizationId || 'unknown',
            status,
        });
    }

    /**
     * Record export job
     */
    recordExportJob(labels: MetricsLabels, format: string, status: string) {
        this.exportJobsTotal.inc({
            organization_id: labels.organization_id || 'unknown',
            project_id: labels.project_id || 'unknown',
            format,
            status,
        });
    }

    /**
     * Record retention sweep
     */
    recordRetentionSweep(organizationId: string, status: string, documentsPurged: number) {
        this.retentionSweepsTotal.inc({
            organization_id: organizationId,
            status,
            documents_purged: documentsPurged.toString(),
        });
    }

    /**
     * Set active documents count
     */
    setActiveDocuments(labels: MetricsLabels, count: number, status: string) {
        this.activeDocuments.set(
            {
                organization_id: labels.organization_id || 'unknown',
                project_id: labels.project_id || 'unknown',
                status,
            },
            count,
        );
    }

    /**
     * Set active threads count
     */
    setActiveThreads(labels: MetricsLabels, count: number) {
        this.activeThreads.set(
            {
                organization_id: labels.organization_id || 'unknown',
                project_id: labels.project_id || 'unknown',
            },
            count,
        );
    }

    /**
     * Set queue size
     */
    setQueueSize(queueName: string, organizationId: string, size: number) {
        this.queueSize.set(
            {
                queue_name: queueName,
                organization_id: organizationId,
            },
            size,
        );
    }

    /**
     * Set worker count
     */
    setWorkerCount(workerType: string, status: string, count: number) {
        this.workerCount.set(
            {
                worker_type: workerType,
                status,
            },
            count,
        );
    }

    /**
     * Set memory usage
     */
    setMemoryUsage(service: string, type: string, bytes: number) {
        this.memoryUsage.set(
            {
                service,
                type,
            },
            bytes,
        );
    }

    /**
     * Set CPU usage
     */
    setCPUUsage(service: string, percentage: number) {
        this.cpuUsage.set(
            {
                service,
            },
            percentage,
        );
    }

    /**
     * Record ingest latency
     */
    recordIngestLatency(labels: MetricsLabels, duration: number, status: string) {
        this.recordDocumentProcessingDuration(labels, duration, status);
    }

    /**
     * Record QA latency
     */
    recordQALatency(labels: MetricsLabels, duration: number, status: string) {
        this.recordQAQueryDuration(labels, duration, status);
    }

    /**
     * Record token throughput
     */
    recordTokenThroughput(labels: MetricsLabels, tokensPerSecond: number, operation: string) {
        // Create a gauge for token throughput
        const tokenThroughputGauge = new Gauge({
            name: 'rag_token_throughput_tokens_per_second',
            help: 'Token throughput in tokens per second',
            labelNames: ['organization_id', 'project_id', 'model_name', 'operation'],
        });

        tokenThroughputGauge.set(
            {
                organization_id: labels.organization_id || 'unknown',
                project_id: labels.project_id || 'unknown',
                model_name: labels.model_name || 'unknown',
                operation,
            },
            tokensPerSecond,
        );
    }

    /**
     * Reset all metrics (useful for testing)
     */
    resetMetrics() {
        register.clear();
        this.initializeMetrics();
    }
}
