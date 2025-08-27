import os
import logging
from typing import Optional, Dict, Any
import sentry_sdk
from sentry_sdk.integrations.logging import LoggingIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.httpx import HttpxIntegration

logger = logging.getLogger(__name__)

class SentryService:
    """Sentry service for error tracking and monitoring in workers."""
    
    def __init__(self):
        self.is_initialized = False
        self._initialize_sentry()
    
    def _initialize_sentry(self):
        """Initialize Sentry SDK."""
        try:
            dsn = os.getenv('SENTRY_DSN')
            environment = os.getenv('NODE_ENV', 'development')
            release = os.getenv('APP_VERSION', '1.0.0')
            traces_sample_rate = float(os.getenv('SENTRY_TRACES_SAMPLE_RATE', '0.1'))
            profiles_sample_rate = float(os.getenv('SENTRY_PROFILES_SAMPLE_RATE', '0.1'))
            enable_tracing = os.getenv('SENTRY_ENABLE_TRACING', 'true').lower() == 'true'
            enable_profiling = os.getenv('SENTRY_ENABLE_PROFILING', 'true').lower() == 'true'
            
            if not dsn:
                logger.warning('SENTRY_DSN not configured, Sentry will not be initialized')
                return
            
            # Configure logging integration
            logging_integration = LoggingIntegration(
                level=logging.INFO,
                event_level=logging.ERROR
            )
            
            # Initialize Sentry
            sentry_sdk.init(
                dsn=dsn,
                environment=environment,
                release=release,
                traces_sample_rate=traces_sample_rate if enable_tracing else 0.0,
                profiles_sample_rate=profiles_sample_rate if enable_profiling else 0.0,
                integrations=[
                    logging_integration,
                    RedisIntegration(),
                    SqlalchemyIntegration(),
                    HttpxIntegration(),
                ],
                before_send=self._before_send,
                before_breadcrumb=self._before_breadcrumb,
                default_tags={
                    'service': 'rag-worker',
                    'component': 'worker',
                }
            )
            
            self.is_initialized = True
            logger.info('Sentry initialized successfully')
        except Exception as e:
            logger.error(f'Failed to initialize Sentry: {e}')
    
    def _before_send(self, event: Dict[str, Any], hint: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Filter sensitive data before sending to Sentry."""
        try:
            # Remove sensitive data from event
            if 'request' in event and 'headers' in event['request']:
                sensitive_headers = ['authorization', 'cookie', 'x-api-key', 'x-auth-token']
                for header in sensitive_headers:
                    if header in event['request']['headers']:
                        event['request']['headers'][header] = '[REDACTED]'
            
            # Remove sensitive data from extra context
            if 'extra' in event:
                sensitive_keys = ['password', 'token', 'secret', 'key', 'api_key']
                for key in sensitive_keys:
                    if key in event['extra']:
                        event['extra'][key] = '[REDACTED]'
            
            # Add custom context
            if 'tags' not in event:
                event['tags'] = {}
            event['tags'].update({
                'service': 'rag-worker',
                'component': 'worker',
            })
            
            return event
        except Exception as e:
            logger.error(f'Error in before_send: {e}')
            return event
    
    def _before_breadcrumb(self, breadcrumb: Dict[str, Any], hint: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Filter sensitive data from breadcrumbs."""
        try:
            # Remove sensitive data from breadcrumb data
            if 'data' in breadcrumb:
                sensitive_keys = ['password', 'token', 'secret', 'key', 'api_key']
                for key in sensitive_keys:
                    if key in breadcrumb['data']:
                        breadcrumb['data'][key] = '[REDACTED]'
            
            return breadcrumb
        except Exception as e:
            logger.error(f'Error in before_breadcrumb: {e}')
            return breadcrumb
    
    def capture_exception(self, exception: Exception, context: Optional[Dict[str, Any]] = None) -> str:
        """Capture an exception."""
        if not self.is_initialized:
            logger.error(f'Exception not captured (Sentry not initialized): {exception}')
            return ''
        
        try:
            event_id = sentry_sdk.capture_exception(
                exception,
                extra=context,
                tags={
                    'service': 'rag-worker',
                    'component': 'worker',
                }
            )
            logger.error(f'Exception captured in Sentry: {event_id}')
            return event_id
        except Exception as e:
            logger.error(f'Failed to capture exception: {e}')
            return ''
    
    def capture_message(self, message: str, level: str = 'info', context: Optional[Dict[str, Any]] = None) -> str:
        """Capture a message."""
        if not self.is_initialized:
            logger.log(logging.INFO, f'Message not captured (Sentry not initialized): {message}')
            return ''
        
        try:
            event_id = sentry_sdk.capture_message(
                message,
                level=level,
                extra=context,
                tags={
                    'service': 'rag-worker',
                    'component': 'worker',
                }
            )
            logger.info(f'Message captured in Sentry: {event_id}')
            return event_id
        except Exception as e:
            logger.error(f'Failed to capture message: {e}')
            return ''
    
    def add_breadcrumb(self, message: str, category: str = 'rag-worker', level: str = 'info', data: Optional[Dict[str, Any]] = None):
        """Add breadcrumb."""
        if not self.is_initialized:
            return
        
        try:
            sentry_sdk.add_breadcrumb(
                message=message,
                category=category,
                level=level,
                data=data
            )
        except Exception as e:
            logger.error(f'Failed to add breadcrumb: {e}')
    
    def set_user(self, user_id: str, email: Optional[str] = None, username: Optional[str] = None):
        """Set user context."""
        if not self.is_initialized:
            return
        
        try:
            sentry_sdk.set_user({
                'id': user_id,
                'email': email,
                'username': username,
            })
        except Exception as e:
            logger.error(f'Failed to set user: {e}')
    
    def set_extra(self, key: str, value: Any):
        """Set extra context."""
        if not self.is_initialized:
            return
        
        try:
            sentry_sdk.set_extra(key, value)
        except Exception as e:
            logger.error(f'Failed to set extra: {e}')
    
    def set_tag(self, key: str, value: str):
        """Set tag."""
        if not self.is_initialized:
            return
        
        try:
            sentry_sdk.set_tag(key, value)
        except Exception as e:
            logger.error(f'Failed to set tag: {e}')
    
    def start_transaction(self, name: str, operation: str) -> Any:
        """Start a transaction."""
        if not self.is_initialized:
            # Return a dummy transaction if Sentry is not initialized
            return DummyTransaction()
        
        try:
            return sentry_sdk.start_transaction(
                name=name,
                op=operation
            )
        except Exception as e:
            logger.error(f'Failed to start transaction: {e}')
            return DummyTransaction()
    
    def get_current_transaction(self) -> Optional[Any]:
        """Get current transaction."""
        if not self.is_initialized:
            return None
        
        try:
            return sentry_sdk.get_current_scope().transaction
        except Exception as e:
            logger.error(f'Failed to get current transaction: {e}')
            return None
    
    def configure_scope(self, callback):
        """Configure scope."""
        if not self.is_initialized:
            return
        
        try:
            sentry_sdk.configure_scope(callback)
        except Exception as e:
            logger.error(f'Failed to configure scope: {e}')
    
    def flush(self, timeout: Optional[float] = None) -> bool:
        """Flush events."""
        if not self.is_initialized:
            return True
        
        try:
            return sentry_sdk.flush(timeout=timeout)
        except Exception as e:
            logger.error(f'Failed to flush Sentry: {e}')
            return False
    
    def close(self):
        """Close Sentry."""
        if not self.is_initialized:
            return
        
        try:
            sentry_sdk.close()
            self.is_initialized = False
            logger.info('Sentry closed successfully')
        except Exception as e:
            logger.error(f'Failed to close Sentry: {e}')
    
    def is_enabled(self) -> bool:
        """Check if Sentry is initialized."""
        return self.is_initialized


class DummyTransaction:
    """Dummy transaction for when Sentry is not initialized."""
    
    def __init__(self):
        self.name = 'dummy'
        self.op = 'dummy'
    
    def finish(self, status: Optional[str] = None):
        pass
    
    def set_tag(self, key: str, value: str):
        pass
    
    def set_data(self, key: str, value: Any):
        pass
    
    def set_status(self, status: str):
        pass
    
    def set_http_status(self, status_code: int):
        pass
    
    def set_measurement(self, name: str, value: float, unit: Optional[str] = None):
        pass
    
    def update_name(self, name: str):
        pass
    
    def get_span(self) -> Optional[Any]:
        return None
    
    def start_child(self, name: str, operation: str) -> Any:
        return DummySpan()


class DummySpan:
    """Dummy span for when Sentry is not initialized."""
    
    def __init__(self):
        self.name = 'dummy'
        self.op = 'dummy'
    
    def finish(self, status: Optional[str] = None):
        pass
    
    def set_tag(self, key: str, value: str):
        pass
    
    def set_data(self, key: str, value: Any):
        pass
    
    def set_status(self, status: str):
        pass


# Global Sentry service instance
sentry_service = SentryService()
