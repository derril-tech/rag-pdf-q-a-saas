import os
import time
import logging
from typing import Optional, Dict, Any
from prometheus_client import (
    Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST,
    CollectorRegistry, multiprocess, start_http_server
)

logger = logging.getLogger(__name__)

class MetricsService:
    """Prometheus metrics service for tracking system performance."""
    
    def __init__(self):
        self.registry = CollectorRegistry()
        self._initialize_metrics()
        self._start_metrics_server()
    
    def _initialize_metrics(self):
        """Initialize all Prometheus metrics."""
        try:
            # Counters
            self.document_uploads_total = Counter(
                'rag_document_uploads_total',
                'Total number of document uploads',
                ['organization_id', 'project_id', 'status', 'error_type'],
                registry=self.registry
            )
            
            self.document_processing_total = Counter(
                'rag_document_processing_total',
                'Total number of document processing jobs',
                ['organization_id', 'project_id', 'worker_type', 'status', 'error_type'],
                registry=self.registry
            )
            
            self.qa_queries_total = Counter(
                'rag_qa_queries_total',
                'Total number of QA queries',
                ['organization_id', 'project_id', 'thread_id', 'status', 'error_type'],
                registry=self.registry
            )
            
            self.tokens_used_total = Counter(
                'rag_tokens_used_total',
                'Total number of tokens used',
                ['organization_id', 'project_id', 'model_name', 'operation'],
                registry=self.registry
            )
            
            self.api_requests_total = Counter(
                'rag_api_requests_total',
                'Total number of API requests',
                ['method', 'endpoint', 'status_code', 'organization_id'],
                registry=self.registry
            )
            
            self.slack_events_total = Counter(
                'rag_slack_events_total',
                'Total number of Slack events',
                ['event_type', 'organization_id', 'status'],
                registry=self.registry
            )
            
            self.export_jobs_total = Counter(
                'rag_export_jobs_total',
                'Total number of export jobs',
                ['organization_id', 'project_id', 'format', 'status'],
                registry=self.registry
            )
            
            self.retention_sweeps_total = Counter(
                'rag_retention_sweeps_total',
                'Total number of retention sweeps',
                ['organization_id', 'status', 'documents_purged'],
                registry=self.registry
            )
            
            # Histograms
            self.document_processing_duration = Histogram(
                'rag_document_processing_duration_seconds',
                'Document processing duration in seconds',
                ['organization_id', 'project_id', 'worker_type', 'status'],
                buckets=[0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300],
                registry=self.registry
            )
            
            self.qa_query_duration = Histogram(
                'rag_qa_query_duration_seconds',
                'QA query duration in seconds',
                ['organization_id', 'project_id', 'thread_id', 'status'],
                buckets=[0.1, 0.5, 1, 2, 5, 10, 30, 60],
                registry=self.registry
            )
            
            self.api_request_duration = Histogram(
                'rag_api_request_duration_seconds',
                'API request duration in seconds',
                ['method', 'endpoint', 'status_code'],
                buckets=[0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
                registry=self.registry
            )
            
            self.token_generation_duration = Histogram(
                'rag_token_generation_duration_seconds',
                'Token generation duration in seconds',
                ['organization_id', 'project_id', 'model_name', 'operation'],
                buckets=[0.1, 0.5, 1, 2, 5, 10, 30, 60],
                registry=self.registry
            )
            
            self.embedding_generation_duration = Histogram(
                'rag_embedding_generation_duration_seconds',
                'Embedding generation duration in seconds',
                ['organization_id', 'project_id', 'model_name', 'chunk_count'],
                buckets=[0.1, 0.5, 1, 2, 5, 10, 30, 60],
                registry=self.registry
            )
            
            # Gauges
            self.active_documents = Gauge(
                'rag_active_documents',
                'Number of active documents',
                ['organization_id', 'project_id', 'status'],
                registry=self.registry
            )
            
            self.active_threads = Gauge(
                'rag_active_threads',
                'Number of active threads',
                ['organization_id', 'project_id'],
                registry=self.registry
            )
            
            self.queue_size = Gauge(
                'rag_queue_size',
                'Number of jobs in queue',
                ['queue_name', 'organization_id'],
                registry=self.registry
            )
            
            self.worker_count = Gauge(
                'rag_worker_count',
                'Number of active workers',
                ['worker_type', 'status'],
                registry=self.registry
            )
            
            self.memory_usage = Gauge(
                'rag_memory_usage_bytes',
                'Memory usage in bytes',
                ['service', 'type'],
                registry=self.registry
            )
            
            self.cpu_usage = Gauge(
                'rag_cpu_usage_percent',
                'CPU usage percentage',
                ['service'],
                registry=self.registry
            )
            
            self.token_throughput = Gauge(
                'rag_token_throughput_tokens_per_second',
                'Token throughput in tokens per second',
                ['organization_id', 'project_id', 'model_name', 'operation'],
                registry=self.registry
            )
            
            logger.info("Prometheus metrics initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Prometheus metrics: {e}")
    
    def _start_metrics_server(self):
        """Start the metrics HTTP server."""
        try:
            metrics_port = int(os.getenv('METRICS_PORT', '9090'))
            start_http_server(metrics_port, registry=self.registry)
            logger.info(f"Prometheus metrics server started on port {metrics_port}")
        except Exception as e:
            logger.error(f"Failed to start metrics server: {e}")
    
    def get_metrics(self) -> bytes:
        """Get metrics in Prometheus format."""
        try:
            return generate_latest(self.registry)
        except Exception as e:
            logger.error(f"Failed to generate metrics: {e}")
            return b''
    
    def record_document_upload(
        self,
        organization_id: str,
        project_id: str,
        status: str,
        error_type: Optional[str] = None
    ):
        """Record document upload."""
        self.document_uploads_total.labels(
            organization_id=organization_id or 'unknown',
            project_id=project_id or 'unknown',
            status=status,
            error_type=error_type or 'none'
        ).inc()
    
    def record_document_processing(
        self,
        organization_id: str,
        project_id: str,
        worker_type: str,
        status: str,
        error_type: Optional[str] = None
    ):
        """Record document processing."""
        self.document_processing_total.labels(
            organization_id=organization_id or 'unknown',
            project_id=project_id or 'unknown',
            worker_type=worker_type,
            status=status,
            error_type=error_type or 'none'
        ).inc()
    
    def record_document_processing_duration(
        self,
        organization_id: str,
        project_id: str,
        worker_type: str,
        duration: float,
        status: str
    ):
        """Record document processing duration."""
        self.document_processing_duration.labels(
            organization_id=organization_id or 'unknown',
            project_id=project_id or 'unknown',
            worker_type=worker_type,
            status=status
        ).observe(duration)
    
    def record_qa_query(
        self,
        organization_id: str,
        project_id: str,
        thread_id: str,
        status: str,
        error_type: Optional[str] = None
    ):
        """Record QA query."""
        self.qa_queries_total.labels(
            organization_id=organization_id or 'unknown',
            project_id=project_id or 'unknown',
            thread_id=thread_id or 'unknown',
            status=status,
            error_type=error_type or 'none'
        ).inc()
    
    def record_qa_query_duration(
        self,
        organization_id: str,
        project_id: str,
        thread_id: str,
        duration: float,
        status: str
    ):
        """Record QA query duration."""
        self.qa_query_duration.labels(
            organization_id=organization_id or 'unknown',
            project_id=project_id or 'unknown',
            thread_id=thread_id or 'unknown',
            status=status
        ).observe(duration)
    
    def record_tokens_used(
        self,
        organization_id: str,
        project_id: str,
        model_name: str,
        token_count: int,
        operation: str
    ):
        """Record tokens used."""
        self.tokens_used_total.labels(
            organization_id=organization_id or 'unknown',
            project_id=project_id or 'unknown',
            model_name=model_name,
            operation=operation
        ).inc(token_count)
    
    def record_token_generation_duration(
        self,
        organization_id: str,
        project_id: str,
        model_name: str,
        duration: float,
        operation: str
    ):
        """Record token generation duration."""
        self.token_generation_duration.labels(
            organization_id=organization_id or 'unknown',
            project_id=project_id or 'unknown',
            model_name=model_name,
            operation=operation
        ).observe(duration)
    
    def record_embedding_generation_duration(
        self,
        organization_id: str,
        project_id: str,
        model_name: str,
        duration: float,
        chunk_count: int
    ):
        """Record embedding generation duration."""
        self.embedding_generation_duration.labels(
            organization_id=organization_id or 'unknown',
            project_id=project_id or 'unknown',
            model_name=model_name,
            chunk_count=str(chunk_count)
        ).observe(duration)
    
    def record_api_request(
        self,
        method: str,
        endpoint: str,
        status_code: int,
        organization_id: Optional[str] = None
    ):
        """Record API request."""
        self.api_requests_total.labels(
            method=method,
            endpoint=endpoint,
            status_code=str(status_code),
            organization_id=organization_id or 'unknown'
        ).inc()
    
    def record_api_request_duration(
        self,
        method: str,
        endpoint: str,
        status_code: int,
        duration: float
    ):
        """Record API request duration."""
        self.api_request_duration.labels(
            method=method,
            endpoint=endpoint,
            status_code=str(status_code)
        ).observe(duration)
    
    def record_slack_event(
        self,
        event_type: str,
        organization_id: Optional[str] = None,
        status: str = 'success'
    ):
        """Record Slack event."""
        self.slack_events_total.labels(
            event_type=event_type,
            organization_id=organization_id or 'unknown',
            status=status
        ).inc()
    
    def record_export_job(
        self,
        organization_id: str,
        project_id: str,
        format: str,
        status: str
    ):
        """Record export job."""
        self.export_jobs_total.labels(
            organization_id=organization_id or 'unknown',
            project_id=project_id or 'unknown',
            format=format,
            status=status
        ).inc()
    
    def record_retention_sweep(
        self,
        organization_id: str,
        status: str,
        documents_purged: int
    ):
        """Record retention sweep."""
        self.retention_sweeps_total.labels(
            organization_id=organization_id,
            status=status,
            documents_purged=str(documents_purged)
        ).inc()
    
    def set_active_documents(
        self,
        organization_id: str,
        project_id: str,
        count: int,
        status: str
    ):
        """Set active documents count."""
        self.active_documents.labels(
            organization_id=organization_id or 'unknown',
            project_id=project_id or 'unknown',
            status=status
        ).set(count)
    
    def set_active_threads(
        self,
        organization_id: str,
        project_id: str,
        count: int
    ):
        """Set active threads count."""
        self.active_threads.labels(
            organization_id=organization_id or 'unknown',
            project_id=project_id or 'unknown'
        ).set(count)
    
    def set_queue_size(
        self,
        queue_name: str,
        organization_id: str,
        size: int
    ):
        """Set queue size."""
        self.queue_size.labels(
            queue_name=queue_name,
            organization_id=organization_id
        ).set(size)
    
    def set_worker_count(
        self,
        worker_type: str,
        status: str,
        count: int
    ):
        """Set worker count."""
        self.worker_count.labels(
            worker_type=worker_type,
            status=status
        ).set(count)
    
    def set_memory_usage(
        self,
        service: str,
        type: str,
        bytes: int
    ):
        """Set memory usage."""
        self.memory_usage.labels(
            service=service,
            type=type
        ).set(bytes)
    
    def set_cpu_usage(
        self,
        service: str,
        percentage: float
    ):
        """Set CPU usage."""
        self.cpu_usage.labels(
            service=service
        ).set(percentage)
    
    def set_token_throughput(
        self,
        organization_id: str,
        project_id: str,
        model_name: str,
        tokens_per_second: float,
        operation: str
    ):
        """Set token throughput."""
        self.token_throughput.labels(
            organization_id=organization_id or 'unknown',
            project_id=project_id or 'unknown',
            model_name=model_name,
            operation=operation
        ).set(tokens_per_second)
    
    def record_ingest_latency(
        self,
        organization_id: str,
        project_id: str,
        duration: float,
        status: str
    ):
        """Record ingest latency."""
        self.record_document_processing_duration(
            organization_id, project_id, 'ingest', duration, status
        )
    
    def record_qa_latency(
        self,
        organization_id: str,
        project_id: str,
        thread_id: str,
        duration: float,
        status: str
    ):
        """Record QA latency."""
        self.record_qa_query_duration(
            organization_id, project_id, thread_id, duration, status
        )
    
    def record_token_throughput(
        self,
        organization_id: str,
        project_id: str,
        model_name: str,
        tokens_per_second: float,
        operation: str
    ):
        """Record token throughput."""
        self.set_token_throughput(
            organization_id, project_id, model_name, tokens_per_second, operation
        )

# Global metrics service instance
metrics_service = MetricsService()
