# Created automatically by Cursor AI (2025-01-27)

import asyncio
import time
from typing import Dict, Any, List

import nats
from nats.aio.client import Client as NATS
import redis.asyncio as redis

from app.core.config import settings
from app.core.logging import WorkerLogger
from app.models.jobs import AnalyticsJob


class AnalyticsWorker:
    """Worker for processing analytics"""
    
    def __init__(self):
        self.name = "analytics"
        self.logger = WorkerLogger(self.name)
        self.is_running = False
        self.processed_jobs = 0
        self.failed_jobs = 0
        
        # External services
        self.nats_client: NATS = None
        self.redis_client: redis.Redis = None
    
    async def start(self) -> None:
        """Start the analytics worker"""
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
                self.logger.logger.error(f"Error in analytics worker: {e}")
                await asyncio.sleep(5)
    
    async def stop(self) -> None:
        """Stop the analytics worker"""
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
        """Process analytics jobs from NATS"""
        try:
            # Subscribe to analytics jobs
            subscription = await self.nats_client.subscribe("jobs.analytics")
            
            async for msg in subscription.messages:
                try:
                    job_data = msg.data.decode()
                    job = AnalyticsJob.parse_raw(job_data)
                    
                    await self._process_analytics_job(job)
                    
                    # Acknowledge message
                    await msg.ack()
                    
                except Exception as e:
                    self.logger.log_job_error(job.event_type, e)
                    self.failed_jobs += 1
                    await msg.nak()
        
        except Exception as e:
            self.logger.logger.error(f"Error processing jobs: {e}")
    
    async def _process_analytics_job(self, job: AnalyticsJob) -> None:
        """Process a single analytics job"""
        start_time = time.time()
        job_id = f"analytics_{job.event_type}_{int(start_time)}"
        
        self.logger.log_job_start(job_id, "analytics", event_type=job.event_type, user_id=job.user_id)
        
        try:
            if job.event_type == "query":
                await self._log_query_analytics(job)
            elif job.event_type == "document_upload":
                await self._log_document_analytics(job)
            elif job.event_type == "user_action":
                await self._log_user_action_analytics(job)
            elif job.event_type == "feedback":
                await self.collect_feedback_signals(job)
            else:
                self.logger.logger.warning(f"Unknown analytics event type: {job.event_type}")
            
            duration = time.time() - start_time
            self.logger.log_job_success(job_id, duration, event_type=job.event_type)
            self.processed_jobs += 1
            
        except Exception as e:
            self.logger.log_job_error(job_id, e, event_type=job.event_type)
            raise
    
    async def _log_query_analytics(self, job: AnalyticsJob) -> None:
        """Log query analytics data"""
        try:
            # Extract query data
            query_data = job.payload
            
            # Log to database
            await self._store_query_stats(
                user_id=job.user_id,
                org_id=job.org_id,
                project_id=job.project_id,
                query=query_data.get("query", ""),
                response_time=query_data.get("response_time", 0),
                tokens_used=query_data.get("tokens_used", 0),
                tokens_input=query_data.get("tokens_input", 0),
                tokens_output=query_data.get("tokens_output", 0),
                model_used=query_data.get("model_used", "unknown"),
                success=query_data.get("success", True),
                error_message=query_data.get("error_message", None),
                source=query_data.get("source", "web"),  # web, slack, api
                thread_id=query_data.get("thread_id", None)
            )
            
            # Update real-time metrics in Redis
            await self._update_realtime_metrics(job)
            
        except Exception as e:
            raise Exception(f"Query analytics logging failed: {e}")
    
    async def _log_document_analytics(self, job: AnalyticsJob) -> None:
        """Log document upload analytics data"""
        try:
            # Extract document data
            document_data = job.payload
            
            # Log to database
            await self._store_document_stats(
                user_id=job.user_id,
                org_id=job.org_id,
                project_id=job.project_id,
                document_id=document_data.get("document_id"),
                file_size=document_data.get("file_size", 0),
                file_type=document_data.get("file_type", "unknown"),
                page_count=document_data.get("page_count", 0),
                chunk_count=document_data.get("chunk_count", 0),
                processing_time=document_data.get("processing_time", 0),
                success=document_data.get("success", True),
                error_message=document_data.get("error_message", None)
            )
            
        except Exception as e:
            raise Exception(f"Document analytics logging failed: {e}")
    
    async def _log_user_action_analytics(self, job: AnalyticsJob) -> None:
        """Log user action analytics data"""
        try:
            # Extract action data
            action_data = job.payload
            
            # Log to database
            await self._store_user_action_stats(
                user_id=job.user_id,
                org_id=job.org_id,
                project_id=job.project_id,
                action=action_data.get("action", "unknown"),
                action_data=action_data.get("action_data", {}),
                timestamp=action_data.get("timestamp", time.time())
            )
            
        except Exception as e:
            raise Exception(f"User action analytics logging failed: {e}")
    
    async def _store_query_stats(self, user_id: str, org_id: str, project_id: str, 
                                query: str, response_time: float, tokens_used: int,
                                tokens_input: int, tokens_output: int, model_used: str,
                                success: bool, error_message: str, source: str, thread_id: str) -> None:
        """Store query statistics in database"""
        try:
            # This would store query stats in the database
            # Implementation depends on your database service
            query_record = {
                "user_id": user_id,
                "org_id": org_id,
                "project_id": project_id,
                "query": query[:500],  # Truncate long queries
                "response_time": response_time,
                "tokens_used": tokens_used,
                "tokens_input": tokens_input,
                "tokens_output": tokens_output,
                "model_used": model_used,
                "success": success,
                "error_message": error_message,
                "source": source,
                "thread_id": thread_id,
                "timestamp": time.time()
            }
            # Store in database
            pass
        except Exception as e:
            self.logger.logger.error(f"Failed to store query stats: {e}")
    
    async def _store_document_stats(self, user_id: str, org_id: str, project_id: str,
                                   document_id: str, file_size: int, file_type: str,
                                   page_count: int, chunk_count: int, processing_time: float,
                                   success: bool, error_message: str) -> None:
        """Store document statistics in database"""
        try:
            # This would store document stats in the database
            # Implementation depends on your database service
            document_record = {
                "user_id": user_id,
                "org_id": org_id,
                "project_id": project_id,
                "document_id": document_id,
                "file_size": file_size,
                "file_type": file_type,
                "page_count": page_count,
                "chunk_count": chunk_count,
                "processing_time": processing_time,
                "success": success,
                "error_message": error_message,
                "timestamp": time.time()
            }
            # Store in database
            pass
        except Exception as e:
            self.logger.logger.error(f"Failed to store document stats: {e}")
    
    async def _store_user_action_stats(self, user_id: str, org_id: str, project_id: str,
                                      action: str, action_data: dict, timestamp: float) -> None:
        """Store user action statistics in database"""
        try:
            # This would store user action stats in the database
            # Implementation depends on your database service
            action_record = {
                "user_id": user_id,
                "org_id": org_id,
                "project_id": project_id,
                "action": action,
                "action_data": action_data,
                "timestamp": timestamp
            }
            # Store in database
            pass
        except Exception as e:
            self.logger.logger.error(f"Failed to store user action stats: {e}")
    
    async def _update_realtime_metrics(self, job: AnalyticsJob) -> None:
        """Update real-time metrics in Redis"""
        try:
            # Update query count
            await self.redis_client.incr(f"metrics:queries:{job.org_id}:{job.project_id}")
            await self.redis_client.incr(f"metrics:queries:global")
            
            # Update token usage
            tokens_used = job.payload.get("tokens_used", 0)
            await self.redis_client.incrby(f"metrics:tokens:{job.org_id}:{job.project_id}", tokens_used)
            await self.redis_client.incrby(f"metrics:tokens:global", tokens_used)
            
            # Update response time (rolling average)
            response_time = job.payload.get("response_time", 0)
            await self._update_rolling_average(f"metrics:response_time:{job.org_id}:{job.project_id}", response_time)
            await self._update_rolling_average(f"metrics:response_time:global", response_time)
            
            # Set expiry for metrics (24 hours)
            await self.redis_client.expire(f"metrics:queries:{job.org_id}:{job.project_id}", 86400)
            await self.redis_client.expire(f"metrics:tokens:{job.org_id}:{job.project_id}", 86400)
            await self.redis_client.expire(f"metrics:response_time:{job.org_id}:{job.project_id}", 86400)
            
        except Exception as e:
            self.logger.logger.error(f"Failed to update real-time metrics: {e}")
    
    async def _update_rolling_average(self, key: str, new_value: float) -> None:
        """Update rolling average in Redis"""
        try:
            # Get current count and sum
            count = await self.redis_client.get(f"{key}:count")
            total = await self.redis_client.get(f"{key}:total")
            
            if count is None:
                count = 0
                total = 0
            else:
                count = int(count)
                total = float(total)
            
            # Update values
            count += 1
            total += new_value
            
            # Store updated values
            await self.redis_client.set(f"{key}:count", count)
            await self.redis_client.set(f"{key}:total", total)
            await self.redis_client.set(f"{key}:avg", total / count)
            
        except Exception as e:
            self.logger.logger.error(f"Failed to update rolling average: {e}")
    
    async def aggregate_nightly_stats(self) -> None:
        """Aggregate nightly usage statistics"""
        try:
            self.logger.logger.info("Starting nightly usage stats aggregation")
            
            # Get all orgs and projects
            orgs_projects = await self._get_all_orgs_projects()
            
            for org_id, projects in orgs_projects.items():
                for project_id in projects:
                    await self._aggregate_project_stats(org_id, project_id)
            
            # Aggregate global stats
            await self._aggregate_global_stats()
            
            self.logger.logger.info("Completed nightly usage stats aggregation")
            
        except Exception as e:
            self.logger.logger.error(f"Failed to aggregate nightly stats: {e}")
    
    async def _aggregate_project_stats(self, org_id: str, project_id: str) -> None:
        """Aggregate statistics for a specific project"""
        try:
            # Get daily metrics from Redis
            queries_count = await self.redis_client.get(f"metrics:queries:{org_id}:{project_id}")
            tokens_used = await self.redis_client.get(f"metrics:tokens:{org_id}:{project_id}")
            response_time_avg = await self.redis_client.get(f"metrics:response_time:{org_id}:{project_id}:avg")
            
            # Convert to appropriate types
            queries_count = int(queries_count) if queries_count else 0
            tokens_used = int(tokens_used) if tokens_used else 0
            response_time_avg = float(response_time_avg) if response_time_avg else 0.0
            
            # Store aggregated stats in database
            await self._store_usage_stats(
                org_id=org_id,
                project_id=project_id,
                date=time.strftime("%Y-%m-%d"),
                queries_count=queries_count,
                tokens_used=tokens_used,
                avg_response_time=response_time_avg,
                active_users=await self._get_active_users_count(org_id, project_id),
                documents_processed=await self._get_documents_processed_count(org_id, project_id)
            )
            
            # Clear daily metrics
            await self.redis_client.delete(f"metrics:queries:{org_id}:{project_id}")
            await self.redis_client.delete(f"metrics:tokens:{org_id}:{project_id}")
            await self.redis_client.delete(f"metrics:response_time:{org_id}:{project_id}:count")
            await self.redis_client.delete(f"metrics:response_time:{org_id}:{project_id}:total")
            await self.redis_client.delete(f"metrics:response_time:{org_id}:{project_id}:avg")
            
        except Exception as e:
            self.logger.logger.error(f"Failed to aggregate project stats for {org_id}:{project_id}: {e}")
    
    async def _aggregate_global_stats(self) -> None:
        """Aggregate global statistics"""
        try:
            # Get global metrics from Redis
            queries_count = await self.redis_client.get("metrics:queries:global")
            tokens_used = await self.redis_client.get("metrics:tokens:global")
            response_time_avg = await self.redis_client.get("metrics:response_time:global:avg")
            
            # Convert to appropriate types
            queries_count = int(queries_count) if queries_count else 0
            tokens_used = int(tokens_used) if tokens_used else 0
            response_time_avg = float(response_time_avg) if response_time_avg else 0.0
            
            # Store global aggregated stats
            await self._store_usage_stats(
                org_id="global",
                project_id="global",
                date=time.strftime("%Y-%m-%d"),
                queries_count=queries_count,
                tokens_used=tokens_used,
                avg_response_time=response_time_avg,
                active_users=await self._get_global_active_users_count(),
                documents_processed=await self._get_global_documents_processed_count()
            )
            
            # Clear global daily metrics
            await self.redis_client.delete("metrics:queries:global")
            await self.redis_client.delete("metrics:tokens:global")
            await self.redis_client.delete("metrics:response_time:global:count")
            await self.redis_client.delete("metrics:response_time:global:total")
            await self.redis_client.delete("metrics:response_time:global:avg")
            
        except Exception as e:
            self.logger.logger.error(f"Failed to aggregate global stats: {e}")
    
    async def _store_usage_stats(self, org_id: str, project_id: str, date: str,
                                queries_count: int, tokens_used: int, avg_response_time: float,
                                active_users: int, documents_processed: int) -> None:
        """Store usage statistics in database"""
        try:
            # This would store usage stats in the database
            # Implementation depends on your database service
            usage_record = {
                "org_id": org_id,
                "project_id": project_id,
                "date": date,
                "queries_count": queries_count,
                "tokens_used": tokens_used,
                "avg_response_time": avg_response_time,
                "active_users": active_users,
                "documents_processed": documents_processed,
                "created_at": time.time()
            }
            # Store in database
            pass
        except Exception as e:
            self.logger.logger.error(f"Failed to store usage stats: {e}")
    
    async def _get_all_orgs_projects(self) -> dict:
        """Get all organizations and their projects"""
        try:
            # This would query the database for all orgs and projects
            # Implementation depends on your database service
            return {
                "org1": ["project1", "project2"],
                "org2": ["project3"]
            }
        except Exception as e:
            self.logger.logger.error(f"Failed to get orgs/projects: {e}")
            return {}
    
    async def _get_active_users_count(self, org_id: str, project_id: str) -> int:
        """Get count of active users for a project"""
        try:
            # This would query the database for active users
            # Implementation depends on your database service
            return 10  # Placeholder
        except Exception as e:
            self.logger.logger.error(f"Failed to get active users count: {e}")
            return 0
    
    async def _get_documents_processed_count(self, org_id: str, project_id: str) -> int:
        """Get count of documents processed for a project"""
        try:
            # This would query the database for processed documents
            # Implementation depends on your database service
            return 25  # Placeholder
        except Exception as e:
            self.logger.logger.error(f"Failed to get documents processed count: {e}")
            return 0
    
    async def _get_global_active_users_count(self) -> int:
        """Get global count of active users"""
        try:
            # This would query the database for global active users
            # Implementation depends on your database service
            return 100  # Placeholder
        except Exception as e:
            self.logger.logger.error(f"Failed to get global active users count: {e}")
            return 0
    
    async def _get_global_documents_processed_count(self) -> int:
        """Get global count of documents processed"""
        try:
            # This would query the database for global processed documents
            # Implementation depends on your database service
            return 500  # Placeholder
        except Exception as e:
            self.logger.logger.error(f"Failed to get global documents processed count: {e}")
            return 0
    
    async def track_top_documents(self) -> None:
        """Track top documents by usage"""
        try:
            self.logger.logger.info("Starting top documents tracking")
            
            # Get all orgs and projects
            orgs_projects = await self._get_all_orgs_projects()
            
            for org_id, projects in orgs_projects.items():
                for project_id in projects:
                    await self._track_project_top_documents(org_id, project_id)
            
            # Track global top documents
            await self._track_global_top_documents()
            
            self.logger.logger.info("Completed top documents tracking")
            
        except Exception as e:
            self.logger.logger.error(f"Failed to track top documents: {e}")
    
    async def track_most_active_projects(self) -> None:
        """Track most active projects"""
        try:
            self.logger.logger.info("Starting most active projects tracking")
            
            # Get all orgs and projects
            orgs_projects = await self._get_all_orgs_projects()
            
            for org_id, projects in orgs_projects.items():
                await self._track_org_most_active_projects(org_id, projects)
            
            # Track global most active projects
            await self._track_global_most_active_projects()
            
            self.logger.logger.info("Completed most active projects tracking")
            
        except Exception as e:
            self.logger.logger.error(f"Failed to track most active projects: {e}")
    
    async def _track_project_top_documents(self, org_id: str, project_id: str) -> None:
        """Track top documents for a specific project"""
        try:
            # Get document usage from database
            document_usage = await self._get_document_usage_stats(org_id, project_id)
            
            # Sort by usage count
            sorted_documents = sorted(document_usage, key=lambda x: x["usage_count"], reverse=True)
            
            # Store top documents
            await self._store_top_documents(
                org_id=org_id,
                project_id=project_id,
                top_documents=sorted_documents[:10],  # Top 10
                period="daily",
                date=time.strftime("%Y-%m-%d")
            )
            
        except Exception as e:
            self.logger.logger.error(f"Failed to track project top documents for {org_id}:{project_id}: {e}")
    
    async def _track_global_top_documents(self) -> None:
        """Track global top documents"""
        try:
            # Get global document usage from database
            document_usage = await self._get_global_document_usage_stats()
            
            # Sort by usage count
            sorted_documents = sorted(document_usage, key=lambda x: x["usage_count"], reverse=True)
            
            # Store global top documents
            await self._store_top_documents(
                org_id="global",
                project_id="global",
                top_documents=sorted_documents[:20],  # Top 20
                period="daily",
                date=time.strftime("%Y-%m-%d")
            )
            
        except Exception as e:
            self.logger.logger.error(f"Failed to track global top documents: {e}")
    
    async def _track_org_most_active_projects(self, org_id: str, projects: list) -> None:
        """Track most active projects for an organization"""
        try:
            # Get project activity from database
            project_activity = await self._get_project_activity_stats(org_id, projects)
            
            # Sort by activity score
            sorted_projects = sorted(project_activity, key=lambda x: x["activity_score"], reverse=True)
            
            # Store most active projects
            await self._store_most_active_projects(
                org_id=org_id,
                most_active_projects=sorted_projects[:5],  # Top 5
                period="daily",
                date=time.strftime("%Y-%m-%d")
            )
            
        except Exception as e:
            self.logger.logger.error(f"Failed to track org most active projects for {org_id}: {e}")
    
    async def _track_global_most_active_projects(self) -> None:
        """Track global most active projects"""
        try:
            # Get global project activity from database
            project_activity = await self._get_global_project_activity_stats()
            
            # Sort by activity score
            sorted_projects = sorted(project_activity, key=lambda x: x["activity_score"], reverse=True)
            
            # Store global most active projects
            await self._store_most_active_projects(
                org_id="global",
                most_active_projects=sorted_projects[:10],  # Top 10
                period="daily",
                date=time.strftime("%Y-%m-%d")
            )
            
        except Exception as e:
            self.logger.logger.error(f"Failed to track global most active projects: {e}")
    
    async def _get_document_usage_stats(self, org_id: str, project_id: str) -> list:
        """Get document usage statistics for a project"""
        try:
            # This would query the database for document usage stats
            # Implementation depends on your database service
            return [
                {
                    "document_id": "doc1",
                    "document_name": "Sample Document 1",
                    "usage_count": 150,
                    "last_used": time.time()
                },
                {
                    "document_id": "doc2", 
                    "document_name": "Sample Document 2",
                    "usage_count": 120,
                    "last_used": time.time()
                }
            ]
        except Exception as e:
            self.logger.logger.error(f"Failed to get document usage stats: {e}")
            return []
    
    async def _get_global_document_usage_stats(self) -> list:
        """Get global document usage statistics"""
        try:
            # This would query the database for global document usage stats
            # Implementation depends on your database service
            return [
                {
                    "document_id": "doc1",
                    "document_name": "Global Sample Document 1",
                    "usage_count": 500,
                    "last_used": time.time()
                }
            ]
        except Exception as e:
            self.logger.logger.error(f"Failed to get global document usage stats: {e}")
            return []
    
    async def _get_project_activity_stats(self, org_id: str, projects: list) -> list:
        """Get project activity statistics for an organization"""
        try:
            # This would query the database for project activity stats
            # Implementation depends on your database service
            return [
                {
                    "project_id": "project1",
                    "project_name": "Sample Project 1",
                    "activity_score": 85.5,
                    "queries_count": 200,
                    "active_users": 15
                },
                {
                    "project_id": "project2",
                    "project_name": "Sample Project 2", 
                    "activity_score": 72.3,
                    "queries_count": 150,
                    "active_users": 12
                }
            ]
        except Exception as e:
            self.logger.logger.error(f"Failed to get project activity stats: {e}")
            return []
    
    async def _get_global_project_activity_stats(self) -> list:
        """Get global project activity statistics"""
        try:
            # This would query the database for global project activity stats
            # Implementation depends on your database service
            return [
                {
                    "project_id": "project1",
                    "project_name": "Global Sample Project 1",
                    "activity_score": 95.2,
                    "queries_count": 500,
                    "active_users": 50
                }
            ]
        except Exception as e:
            self.logger.logger.error(f"Failed to get global project activity stats: {e}")
            return []
    
    async def _store_top_documents(self, org_id: str, project_id: str, top_documents: list, 
                                  period: str, date: str) -> None:
        """Store top documents in database"""
        try:
            # This would store top documents in the database
            # Implementation depends on your database service
            for i, doc in enumerate(top_documents, 1):
                doc_record = {
                    "org_id": org_id,
                    "project_id": project_id,
                    "document_id": doc["document_id"],
                    "document_name": doc["document_name"],
                    "usage_count": doc["usage_count"],
                    "rank": i,
                    "period": period,
                    "date": date,
                    "created_at": time.time()
                }
                # Store in database
                pass
        except Exception as e:
            self.logger.logger.error(f"Failed to store top documents: {e}")
    
    async def _store_most_active_projects(self, org_id: str, most_active_projects: list,
                                         period: str, date: str) -> None:
        """Store most active projects in database"""
        try:
            # This would store most active projects in the database
            # Implementation depends on your database service
            for i, project in enumerate(most_active_projects, 1):
                project_record = {
                    "org_id": org_id,
                    "project_id": project["project_id"],
                    "project_name": project["project_name"],
                    "activity_score": project["activity_score"],
                    "queries_count": project["queries_count"],
                    "active_users": project["active_users"],
                    "rank": i,
                    "period": period,
                    "date": date,
                    "created_at": time.time()
                }
                # Store in database
                pass
        except Exception as e:
            self.logger.logger.error(f"Failed to store most active projects: {e}")
    
    async def collect_feedback_signals(self, job: AnalyticsJob) -> None:
        """Collect feedback signals from users"""
        try:
            # Extract feedback data
            feedback_data = job.payload
            
            # Store feedback in database
            await self._store_feedback(
                user_id=job.user_id,
                org_id=job.org_id,
                project_id=job.project_id,
                message_id=feedback_data.get("message_id"),
                thread_id=feedback_data.get("thread_id"),
                feedback_type=feedback_data.get("feedback_type"),  # thumbs_up, thumbs_down, comment
                feedback_value=feedback_data.get("feedback_value"),
                comment=feedback_data.get("comment"),
                timestamp=feedback_data.get("timestamp", time.time())
            )
            
            # Update feedback metrics
            await self._update_feedback_metrics(job)
            
        except Exception as e:
            raise Exception(f"Feedback collection failed: {e}")
    
    async def _store_feedback(self, user_id: str, org_id: str, project_id: str,
                             message_id: str, thread_id: str, feedback_type: str,
                             feedback_value: str, comment: str, timestamp: float) -> None:
        """Store feedback in database"""
        try:
            # This would store feedback in the database
            # Implementation depends on your database service
            feedback_record = {
                "user_id": user_id,
                "org_id": org_id,
                "project_id": project_id,
                "message_id": message_id,
                "thread_id": thread_id,
                "feedback_type": feedback_type,
                "feedback_value": feedback_value,
                "comment": comment,
                "timestamp": timestamp,
                "created_at": time.time()
            }
            # Store in database
            pass
        except Exception as e:
            self.logger.logger.error(f"Failed to store feedback: {e}")
    
    async def _update_feedback_metrics(self, job: AnalyticsJob) -> None:
        """Update feedback metrics in Redis"""
        try:
            feedback_data = job.payload
            feedback_type = feedback_data.get("feedback_type")
            
            # Update feedback counts
            await self.redis_client.incr(f"feedback:{feedback_type}:{job.org_id}:{job.project_id}")
            await self.redis_client.incr(f"feedback:{feedback_type}:global")
            
            # Update satisfaction score if thumbs up/down
            if feedback_type in ["thumbs_up", "thumbs_down"]:
                await self._update_satisfaction_score(job)
            
            # Set expiry for metrics (24 hours)
            await self.redis_client.expire(f"feedback:{feedback_type}:{job.org_id}:{job.project_id}", 86400)
            await self.redis_client.expire(f"feedback:{feedback_type}:global", 86400)
            
        except Exception as e:
            self.logger.logger.error(f"Failed to update feedback metrics: {e}")
    
    async def _update_satisfaction_score(self, job: AnalyticsJob) -> None:
        """Update satisfaction score based on feedback"""
        try:
            feedback_data = job.payload
            feedback_type = feedback_data.get("feedback_type")
            
            # Get current counts
            thumbs_up = await self.redis_client.get(f"feedback:thumbs_up:{job.org_id}:{job.project_id}")
            thumbs_down = await self.redis_client.get(f"feedback:thumbs_down:{job.org_id}:{job.project_id}")
            
            thumbs_up = int(thumbs_up) if thumbs_up else 0
            thumbs_down = int(thumbs_down) if thumbs_down else 0
            
            # Calculate satisfaction score (0-100)
            total_feedback = thumbs_up + thumbs_down
            if total_feedback > 0:
                satisfaction_score = (thumbs_up / total_feedback) * 100
            else:
                satisfaction_score = 0
            
            # Store satisfaction score
            await self.redis_client.set(f"satisfaction_score:{job.org_id}:{job.project_id}", satisfaction_score)
            await self.redis_client.expire(f"satisfaction_score:{job.org_id}:{job.project_id}", 86400)
            
        except Exception as e:
            self.logger.logger.error(f"Failed to update satisfaction score: {e}")
    
    async def get_feedback_summary(self, org_id: str, project_id: str, period: str = "daily") -> dict:
        """Get feedback summary for a project"""
        try:
            # Get feedback counts from Redis
            thumbs_up = await self.redis_client.get(f"feedback:thumbs_up:{org_id}:{project_id}")
            thumbs_down = await self.redis_client.get(f"feedback:thumbs_down:{org_id}:{project_id}")
            comments = await self.redis_client.get(f"feedback:comment:{org_id}:{project_id}")
            satisfaction_score = await self.redis_client.get(f"satisfaction_score:{org_id}:{project_id}")
            
            # Convert to appropriate types
            thumbs_up = int(thumbs_up) if thumbs_up else 0
            thumbs_down = int(thumbs_down) if thumbs_down else 0
            comments = int(comments) if comments else 0
            satisfaction_score = float(satisfaction_score) if satisfaction_score else 0.0
            
            return {
                "thumbs_up": thumbs_up,
                "thumbs_down": thumbs_down,
                "comments": comments,
                "satisfaction_score": satisfaction_score,
                "total_feedback": thumbs_up + thumbs_down + comments,
                "period": period,
                "org_id": org_id,
                "project_id": project_id
            }
            
        except Exception as e:
            self.logger.logger.error(f"Failed to get feedback summary: {e}")
            return {}
