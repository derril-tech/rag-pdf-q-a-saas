import os
import logging
from typing import Optional, Dict, Any, List
from contextlib import contextmanager
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.semconv.resource import ResourceAttributes
from opentelemetry.trace import SpanKind, Status, StatusCode
from opentelemetry.context import Context
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator

logger = logging.getLogger(__name__)

class TelemetryService:
    """OpenTelemetry service for distributed tracing across workers."""
    
    def __init__(self):
        self.tracer_provider: Optional[TracerProvider] = None
        self.tracer: Optional[trace.Tracer] = None
        self.propagator = TraceContextTextMapPropagator()
        self._initialize_otel()
    
    def _initialize_otel(self):
        """Initialize OpenTelemetry tracing."""
        try:
            service_name = os.getenv('OTEL_SERVICE_NAME', 'rag-worker')
            service_version = os.getenv('OTEL_SERVICE_VERSION', '1.0.0')
            environment = os.getenv('NODE_ENV', 'development')
            otel_endpoint = os.getenv('OTEL_EXPORTER_OTLP_ENDPOINT')
            
            # Create tracer provider
            self.tracer_provider = TracerProvider(
                resource=Resource.create({
                    ResourceAttributes.SERVICE_NAME: service_name,
                    ResourceAttributes.SERVICE_VERSION: service_version,
                    ResourceAttributes.DEPLOYMENT_ENVIRONMENT: environment,
                })
            )
            
            # Configure span processor
            if otel_endpoint:
                exporter = OTLPSpanExporter(
                    endpoint=f"{otel_endpoint}/v1/traces"
                )
                self.tracer_provider.add_span_processor(
                    BatchSpanProcessor(exporter)
                )
            
            # Set the tracer provider
            trace.set_tracer_provider(self.tracer_provider)
            
            # Get tracer
            self.tracer = trace.get_tracer(service_name, service_version)
            
            logger.info("OpenTelemetry tracing initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize OpenTelemetry: {e}")
    
    def create_span(
        self,
        name: str,
        kind: SpanKind = SpanKind.INTERNAL,
        attributes: Optional[Dict[str, Any]] = None,
        parent_context: Optional[Context] = None
    ) -> Optional[trace.Span]:
        """Create a new span."""
        if not self.tracer:
            return None
        
        span = self.tracer.start_span(
            name,
            kind=kind,
            attributes=attributes or {},
            context=parent_context
        )
        return span
    
    @contextmanager
    def span(
        self,
        name: str,
        kind: SpanKind = SpanKind.INTERNAL,
        attributes: Optional[Dict[str, Any]] = None,
        parent_context: Optional[Context] = None
    ):
        """Context manager for creating and managing spans."""
        span = self.create_span(name, kind, attributes, parent_context)
        if not span:
            yield None
            return
        
        try:
            yield span
            span.set_status(Status(StatusCode.OK))
        except Exception as e:
            span.set_status(Status(StatusCode.ERROR, str(e)))
            span.record_exception(e)
            raise
        finally:
            span.end()
    
    def get_current_span(self) -> Optional[trace.Span]:
        """Get the current active span."""
        return trace.get_current_span()
    
    def add_event(self, name: str, attributes: Optional[Dict[str, Any]] = None):
        """Add event to current span."""
        span = self.get_current_span()
        if span:
            span.add_event(name, attributes or {})
    
    def set_attributes(self, attributes: Dict[str, Any]):
        """Set attributes on current span."""
        span = self.get_current_span()
        if span:
            span.set_attributes(attributes)
    
    def set_error(self, error: Exception):
        """Mark current span as error."""
        span = self.get_current_span()
        if span:
            span.set_status(Status(StatusCode.ERROR, str(error)))
            span.record_exception(error)
    
    def set_success(self):
        """Mark current span as success."""
        span = self.get_current_span()
        if span:
            span.set_status(Status(StatusCode.OK))
    
    def extract_trace_context(self, headers: Dict[str, str]) -> Optional[Context]:
        """Extract trace context from headers."""
        try:
            return self.propagator.extract(
                carrier=headers,
                context=Context()
            )
        except Exception as e:
            logger.warning(f"Failed to extract trace context: {e}")
            return None
    
    def inject_trace_context(self, headers: Dict[str, str]):
        """Inject trace context into headers."""
        try:
            span = self.get_current_span()
            if span:
                self.propagator.inject(
                    carrier=headers,
                    context=trace.set_span_in_context(span)
                )
        except Exception as e:
            logger.warning(f"Failed to inject trace context: {e}")
    
    def create_http_span(
        self,
        method: str,
        url: str,
        status_code: Optional[int] = None
    ) -> Optional[trace.Span]:
        """Create a span for HTTP requests."""
        attributes = {
            'http.method': method,
            'http.url': url,
        }
        if status_code:
            attributes['http.status_code'] = status_code
        
        return self.create_span(
            f"{method} {url}",
            kind=SpanKind.CLIENT,
            attributes=attributes
        )
    
    def create_db_span(
        self,
        operation: str,
        table: Optional[str] = None,
        query: Optional[str] = None
    ) -> Optional[trace.Span]:
        """Create a span for database operations."""
        attributes = {
            'db.operation': operation,
        }
        if table:
            attributes['db.table'] = table
        if query:
            attributes['db.query'] = query
        
        return self.create_span(
            f"db.{operation}",
            kind=SpanKind.CLIENT,
            attributes=attributes
        )
    
    def create_external_span(
        self,
        service: str,
        operation: str,
        endpoint: Optional[str] = None
    ) -> Optional[trace.Span]:
        """Create a span for external service calls."""
        attributes = {
            'service.name': service,
            'service.operation': operation,
        }
        if endpoint:
            attributes['service.endpoint'] = endpoint
        
        return self.create_span(
            f"{service}.{operation}",
            kind=SpanKind.CLIENT,
            attributes=attributes
        )
    
    def create_worker_span(
        self,
        job_type: str,
        job_id: str,
        organization_id: Optional[str] = None
    ) -> Optional[trace.Span]:
        """Create a span for worker jobs."""
        attributes = {
            'job.type': job_type,
            'job.id': job_id,
        }
        if organization_id:
            attributes['organization.id'] = organization_id
        
        return self.create_span(
            f"worker.{job_type}",
            kind=SpanKind.CONSUMER,
            attributes=attributes
        )
    
    def create_document_span(
        self,
        operation: str,
        document_id: str,
        organization_id: Optional[str] = None
    ) -> Optional[trace.Span]:
        """Create a span for document processing."""
        attributes = {
            'document.operation': operation,
            'document.id': document_id,
        }
        if organization_id:
            attributes['organization.id'] = organization_id
        
        return self.create_span(
            f"document.{operation}",
            kind=SpanKind.INTERNAL,
            attributes=attributes
        )
    
    def create_qa_span(
        self,
        operation: str,
        thread_id: Optional[str] = None,
        organization_id: Optional[str] = None
    ) -> Optional[trace.Span]:
        """Create a span for chat/QA operations."""
        attributes = {
            'qa.operation': operation,
        }
        if thread_id:
            attributes['thread.id'] = thread_id
        if organization_id:
            attributes['organization.id'] = organization_id
        
        return self.create_span(
            f"qa.{operation}",
            kind=SpanKind.INTERNAL,
            attributes=attributes
        )
    
    def get_current_trace_id(self) -> Optional[str]:
        """Get trace ID from current span."""
        span = self.get_current_span()
        if span:
            return span.get_span_context().trace_id
        return None
    
    def get_current_span_id(self) -> Optional[str]:
        """Get span ID from current span."""
        span = self.get_current_span()
        if span:
            return span.get_span_context().span_id
        return None
    
    def is_enabled(self) -> bool:
        """Check if tracing is enabled."""
        return self.tracer is not None
    
    def shutdown(self):
        """Shutdown OpenTelemetry."""
        try:
            if self.tracer_provider:
                self.tracer_provider.shutdown()
                logger.info("OpenTelemetry tracing shutdown successfully")
        except Exception as e:
            logger.error(f"Failed to shutdown OpenTelemetry: {e}")

# Global telemetry service instance
telemetry_service = TelemetryService()
