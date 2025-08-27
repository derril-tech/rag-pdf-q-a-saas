# Created automatically by Cursor AI (2025-01-27)

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import setup_logging
from app.workers.ingest_worker import IngestWorker
from app.workers.embed_worker import EmbedWorker
from app.workers.qa_worker import QAWorker
from app.workers.slack_worker import SlackWorker
from app.workers.export_worker import ExportWorker
from app.workers.analytics_worker import AnalyticsWorker

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)

# Global worker instances
workers = []

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting workers...")
    
    # Initialize workers
    ingest_worker = IngestWorker()
    embed_worker = EmbedWorker()
    qa_worker = QAWorker()
    slack_worker = SlackWorker()
    export_worker = ExportWorker()
    analytics_worker = AnalyticsWorker()
    
    workers.extend([
        ingest_worker,
        embed_worker,
        qa_worker,
        slack_worker,
        export_worker,
        analytics_worker,
    ])
    
    # Start workers
    tasks = []
    for worker in workers:
        task = asyncio.create_task(worker.start())
        tasks.append(task)
    
    logger.info(f"Started {len(workers)} workers")
    
    yield
    
    # Shutdown
    logger.info("Shutting down workers...")
    
    # Stop workers
    for worker in workers:
        await worker.stop()
    
    # Cancel tasks
    for task in tasks:
        task.cancel()
    
    # Wait for tasks to complete
    await asyncio.gather(*tasks, return_exceptions=True)
    
    logger.info("Workers stopped")

# Create FastAPI app
app = FastAPI(
    title="RAG PDF Q&A Workers",
    description="Background workers for RAG PDF Q&A SaaS",
    version="1.0.0",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "workers": len(workers),
        "timestamp": asyncio.get_event_loop().time(),
    }

@app.get("/workers/status")
async def workers_status():
    """Get status of all workers"""
    status = {}
    for worker in workers:
        status[worker.name] = {
            "running": worker.is_running,
            "processed_jobs": worker.processed_jobs,
            "failed_jobs": worker.failed_jobs,
        }
    return status

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info",
    )
