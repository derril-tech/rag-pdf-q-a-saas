# Created automatically by Cursor AI (2025-01-27)

import logging
import sys
from typing import Any, Dict

import structlog
from pythonjsonlogger import jsonlogger


def setup_logging() -> None:
    """Setup structured logging for the application"""
    
    # Configure structlog
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer(),
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
    
    # Configure standard library logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=logging.INFO,
    )
    
    # Set log levels for specific modules
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)
    logging.getLogger("nats").setLevel(logging.WARNING)
    logging.getLogger("redis").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("openai").setLevel(logging.WARNING)


def get_logger(name: str) -> structlog.BoundLogger:
    """Get a structured logger instance"""
    return structlog.get_logger(name)


class WorkerLogger:
    """Logger wrapper for workers with additional context"""
    
    def __init__(self, worker_name: str):
        self.logger = get_logger(f"worker.{worker_name}")
        self.worker_name = worker_name
    
    def log_job_start(self, job_id: str, job_type: str, **kwargs) -> None:
        """Log job start"""
        self.logger.info(
            "Job started",
            worker=self.worker_name,
            job_id=job_id,
            job_type=job_type,
            **kwargs,
        )
    
    def log_job_success(self, job_id: str, duration: float, **kwargs) -> None:
        """Log job success"""
        self.logger.info(
            "Job completed",
            worker=self.worker_name,
            job_id=job_id,
            duration=duration,
            **kwargs,
        )
    
    def log_job_error(self, job_id: str, error: Exception, **kwargs) -> None:
        """Log job error"""
        self.logger.error(
            "Job failed",
            worker=self.worker_name,
            job_id=job_id,
            error=str(error),
            error_type=type(error).__name__,
            **kwargs,
        )
    
    def log_worker_start(self) -> None:
        """Log worker start"""
        self.logger.info(
            "Worker started",
            worker=self.worker_name,
        )
    
    def log_worker_stop(self) -> None:
        """Log worker stop"""
        self.logger.info(
            "Worker stopped",
            worker=self.worker_name,
        )
