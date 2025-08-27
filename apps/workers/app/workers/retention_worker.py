# Created automatically by Cursor AI (2025-01-27)

import asyncio
import time
from typing import Dict, Any, Optional
import logging

import nats
from nats.aio.client import Client as NATS
import redis.asyncio as redis

from app.core.config import settings
from app.core.logging import WorkerLogger
from app.models.jobs import RetentionJob
from app.services.retention import RetentionService


class RetentionWorker:
    """Worker for handling data retention and cleanup tasks"""
    
    def __init__(self):
        self.name = "retention"
        self.logger = WorkerLogger(self.name)
        self.is_running = False
        self.processed_jobs = 0
        self.failed_jobs = 0
        
        # External services
        self.nats_client: NATS = None
        self.redis_client: redis.Redis = None
        self.retention_service = RetentionService()
    
    async def start(self) -> None:
        """Start the retention worker"""
        self.logger.log_worker_start()
        self.is_running = True
        
        # Initialize connections
        await self._init_connections()
        
        # Start processing loop
        while self.is_running:
            try:
                await self._process_jobs()
                await asyncio.sleep(1)
            except Exception as e:
                self.logger.logger.error(f"Error in retention worker: {e}")
                await asyncio.sleep(5)
    
    async def stop(self) -> None:
        """Stop the retention worker"""
        self.logger.log_worker_stop()
        self.is_running = False
        
        if self.nats_client:
            await self.nats_client.close()
        if self.redis_client:
            await self.redis_client.close()
    
    async def _init_connections(self) -> None:
        """Initialize external service connections"""
        # Connect to NATS
        self.nats_client = nats.NATS()
        await self.nats_client.connect(settings.NATS_URL)
        
        # Connect to Redis
        self.redis_client = redis.from_url(settings.REDIS_URL)
    
    async def _process_jobs(self) -> None:
        """Process retention jobs from NATS"""
        try:
            # Subscribe to retention jobs
            subscription = await self.nats_client.subscribe("jobs.retention")
            
            async for msg in subscription.messages:
                try:
                    job_data = msg.data.decode()
                    job = RetentionJob.parse_raw(job_data)
                    
                    await self._process_retention_job(job)
                    
                    # Acknowledge message
                    await msg.ack()
                    
                except Exception as e:
                    self.logger.log_job_error(job.retention_type, e)
                    self.failed_jobs += 1
                    await msg.nak()
        
        except Exception as e:
            self.logger.logger.error(f"Error processing jobs: {e}")
    
    async def _process_retention_job(self, job: RetentionJob) -> None:
        """Process a single retention job"""
        start_time = time.time()
        job_id = f"retention_{job.retention_type}_{int(start_time)}"
        
        self.logger.log_job_start(job_id, "retention", retention_type=job.retention_type, organization_id=job.organization_id)
        
        try:
            if job.retention_type == "sweep":
                await self._run_retention_sweep(job)
            elif job.retention_type == "cleanup_orphaned":
                await self._cleanup_orphaned_files(job)
            elif job.retention_type == "stats":
                await self._generate_retention_stats(job)
            else:
                self.logger.logger.warning(f"Unknown retention type: {job.retention_type}")
            
            duration = time.time() - start_time
            self.logger.log_job_success(job_id, duration, retention_type=job.retention_type)
            self.processed_jobs += 1
            
        except Exception as e:
            self.logger.log_job_error(job_id, e, retention_type=job.retention_type)
            raise
    
    async def _run_retention_sweep(self, job: RetentionJob) -> None:
        """Run a retention sweep"""
        try:
            # Run the retention sweep
            results = await self.retention_service.run_retention_sweep(
                organization_id=job.organization_id
            )
            
            # Update job with results
            job.result = {
                "documents_purged": results["documents_purged"],
                "chunks_purged": results["chunks_purged"],
                "files_purged": results["files_purged"],
                "duration": results["duration"],
                "errors": results["errors"],
            }
            
            # Store results in Redis for monitoring
            await self._store_retention_results(job.organization_id, results)
            
            self.logger.logger.info(f"Retention sweep completed: {results}")
            
        except Exception as e:
            raise Exception(f"Retention sweep failed: {e}")
    
    async def _cleanup_orphaned_files(self, job: RetentionJob) -> None:
        """Clean up orphaned files"""
        try:
            # Run orphaned file cleanup
            results = await self.retention_service.cleanup_orphaned_files()
            
            # Update job with results
            job.result = {
                "files_checked": results["files_checked"],
                "orphaned_files_deleted": results["orphaned_files_deleted"],
                "errors": results["errors"],
            }
            
            self.logger.logger.info(f"Orphaned file cleanup completed: {results}")
            
        except Exception as e:
            raise Exception(f"Orphaned file cleanup failed: {e}")
    
    async def _generate_retention_stats(self, job: RetentionJob) -> None:
        """Generate retention statistics"""
        try:
            # Get retention stats
            stats = await self.retention_service.get_retention_stats(
                organization_id=job.organization_id
            )
            
            # Update job with results
            job.result = {
                "stats": stats,
                "generated_at": time.time(),
            }
            
            # Store stats in Redis for monitoring
            await self._store_retention_stats(job.organization_id, stats)
            
            self.logger.logger.info(f"Retention stats generated: {stats}")
            
        except Exception as e:
            raise Exception(f"Retention stats generation failed: {e}")
    
    async def _store_retention_results(self, organization_id: Optional[str], results: Dict[str, Any]) -> None:
        """Store retention results in Redis for monitoring"""
        try:
            key = f"retention:results:{organization_id or 'global'}:{int(time.time())}"
            await self.redis_client.setex(key, 86400, str(results))  # Store for 24 hours
            
            # Update latest results
            latest_key = f"retention:latest:{organization_id or 'global'}"
            await self.redis_client.setex(latest_key, 86400, str(results))
            
        except Exception as e:
            self.logger.logger.error(f"Failed to store retention results: {e}")
    
    async def _store_retention_stats(self, organization_id: Optional[str], stats: Dict[str, Any]) -> None:
        """Store retention stats in Redis for monitoring"""
        try:
            key = f"retention:stats:{organization_id or 'global'}:{int(time.time())}"
            await self.redis_client.setex(key, 86400, str(stats))  # Store for 24 hours
            
            # Update latest stats
            latest_key = f"retention:stats:latest:{organization_id or 'global'}"
            await self.redis_client.setex(latest_key, 86400, str(stats))
            
        except Exception as e:
            self.logger.logger.error(f"Failed to store retention stats: {e}")
    
    async def schedule_daily_sweep(self) -> None:
        """Schedule a daily retention sweep (called by scheduler)"""
        try:
            # Publish retention sweep job
            job = RetentionJob(
                retention_type="sweep",
                organization_id=None,  # Global sweep
                priority="low",
                scheduled_at=time.time(),
            )
            
            await self.nats_client.publish(
                "jobs.retention",
                job.json().encode()
            )
            
            self.logger.logger.info("Daily retention sweep scheduled")
            
        except Exception as e:
            self.logger.logger.error(f"Failed to schedule daily retention sweep: {e}")
    
    async def schedule_weekly_cleanup(self) -> None:
        """Schedule a weekly orphaned file cleanup (called by scheduler)"""
        try:
            # Publish orphaned file cleanup job
            job = RetentionJob(
                retention_type="cleanup_orphaned",
                organization_id=None,  # Global cleanup
                priority="low",
                scheduled_at=time.time(),
            )
            
            await self.nats_client.publish(
                "jobs.retention",
                job.json().encode()
            )
            
            self.logger.logger.info("Weekly orphaned file cleanup scheduled")
            
        except Exception as e:
            self.logger.logger.error(f"Failed to schedule weekly cleanup: {e}")
    
    async def schedule_stats_generation(self) -> None:
        """Schedule retention stats generation (called by scheduler)"""
        try:
            # Publish stats generation job
            job = RetentionJob(
                retention_type="stats",
                organization_id=None,  # Global stats
                priority="low",
                scheduled_at=time.time(),
            )
            
            await self.nats_client.publish(
                "jobs.retention",
                job.json().encode()
            )
            
            self.logger.logger.info("Retention stats generation scheduled")
            
        except Exception as e:
            self.logger.logger.error(f"Failed to schedule stats generation: {e}")
    
    async def get_worker_stats(self) -> Dict[str, Any]:
        """Get worker statistics"""
        return {
            "name": self.name,
            "is_running": self.is_running,
            "processed_jobs": self.processed_jobs,
            "failed_jobs": self.failed_jobs,
            "uptime": time.time() - self.start_time if hasattr(self, 'start_time') else 0,
        }
