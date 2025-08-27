# Created automatically by Cursor AI (2025-01-27)

import asyncio
import time
from typing import Dict, Any, List

import nats
from nats.aio.client import Client as NATS
import redis.asyncio as redis
import openai

from app.core.config import settings
from app.core.logging import WorkerLogger
from app.models.jobs import EmbedJob


class EmbedWorker:
    """Worker for generating embeddings"""
    
    def __init__(self):
        self.name = "embed"
        self.logger = WorkerLogger(self.name)
        self.is_running = False
        self.processed_jobs = 0
        self.failed_jobs = 0
        
        # External services
        self.nats_client: NATS = None
        self.redis_client: redis.Redis = None
        
        # OpenAI client
        self.openai_client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    
    async def start(self) -> None:
        """Start the embed worker"""
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
                self.logger.logger.error(f"Error in embed worker: {e}")
                await asyncio.sleep(5)
    
    async def stop(self) -> None:
        """Stop the embed worker"""
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
        """Process embed jobs from NATS"""
        try:
            # Subscribe to embed jobs
            subscription = await self.nats_client.subscribe("jobs.embed")
            
            async for msg in subscription.messages:
                try:
                    job_data = msg.data.decode()
                    job = EmbedJob.parse_raw(job_data)
                    
                    await self._process_embed_job(job)
                    
                    # Acknowledge message
                    await msg.ack()
                    
                except Exception as e:
                    self.logger.log_job_error(job.document_id, e)
                    self.failed_jobs += 1
                    await msg.nak()
        
        except Exception as e:
            self.logger.logger.error(f"Error processing jobs: {e}")
    
    async def _process_embed_job(self, job: EmbedJob) -> None:
        """Process a single embed job"""
        start_time = time.time()
        job_id = str(job.document_id)
        
        self.logger.log_job_start(job_id, "embed", document_id=job.document_id)
        
        try:
            # Generate embeddings for chunks
            embeddings = await self._generate_embeddings(job.chunks)
            
            # Store embeddings in database
            await self._store_embeddings(job.document_id, job.chunks, embeddings)
            
            # Update document status to embedded
            await self._update_document_status(job.document_id, "embedded")
            
            duration = time.time() - start_time
            self.logger.log_job_success(job_id, duration, document_id=job.document_id)
            self.processed_jobs += 1
            
        except Exception as e:
            # Update document status to failed
            await self._update_document_status(job.document_id, "failed", {"error": str(e)})
            raise
    
    async def _generate_embeddings(self, chunks: List[Dict[str, Any]]) -> List[List[float]]:
        """Generate embeddings for text chunks"""
        embeddings = []
        
        for chunk in chunks:
            try:
                response = await self.openai_client.embeddings.create(
                    model=settings.OPENAI_EMBEDDING_MODEL,
                    input=chunk["content"]
                )
                embeddings.append(response.data[0].embedding)
            except Exception as e:
                raise Exception(f"Failed to generate embedding: {e}")
        
        return embeddings
    
    async def _store_embeddings(self, document_id: str, chunks: List[Dict[str, Any]], embeddings: List[List[float]]) -> None:
        """Store embeddings in database"""
        try:
            # This would store the embeddings in the database
            # Implementation depends on your database service
            pass
        except Exception as e:
            self.logger.logger.error(f"Failed to store embeddings: {e}")
            raise
    
    async def _update_document_status(self, document_id: str, status: str, metadata: Dict[str, Any] = None) -> None:
        """Update document status in database"""
        try:
            # This would update the document status in the database
            # Implementation depends on your database service
            pass
        except Exception as e:
            self.logger.logger.error(f"Failed to update document status: {e}")
