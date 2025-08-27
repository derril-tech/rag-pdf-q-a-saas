# Created automatically by Cursor AI (2025-01-27)

import asyncio
import os
import tempfile
import time
from typing import Dict, Any, List
from pathlib import Path

import nats
from nats.aio.client import Client as NATS
import redis.asyncio as redis
import boto3
from botocore.exceptions import ClientError
import clamd
from pdfminer.high_level import extract_text
from pdfminer.layout import LAParams
import fitz  # PyMuPDF
import easyocr
from PIL import Image
import numpy as np

from app.core.config import settings
from app.core.logging import WorkerLogger
from app.models.jobs import IngestJob
from app.services.database import DatabaseService
from app.services.storage import StorageService


class IngestWorker:
    """Worker for processing PDF documents"""
    
    def __init__(self):
        self.name = "ingest"
        self.logger = WorkerLogger(self.name)
        self.is_running = False
        self.processed_jobs = 0
        self.failed_jobs = 0
        
        # Services
        self.db = DatabaseService()
        self.storage = StorageService()
        
        # External services
        self.nats_client: NATS = None
        self.redis_client: redis.Redis = None
        self.clamav_client: clamd.ClamdUnixSocket = None
        self.ocr_reader: easyocr.Reader = None
        
        # S3 client
        self.s3_client = boto3.client(
            's3',
            endpoint_url=settings.S3_ENDPOINT,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            region_name=settings.S3_REGION,
            use_ssl=settings.S3_SECURE,
        )
    
    async def start(self) -> None:
        """Start the ingest worker"""
        self.logger.log_worker_start()
        self.is_running = True
        
        # Initialize connections
        await self._init_connections()
        
        # Initialize OCR if enabled
        if settings.ENABLE_OCR:
            self.ocr_reader = easyocr.Reader(settings.OCR_LANGUAGES)
        
        # Start processing loop
        while self.is_running:
            try:
                await self._process_jobs()
                await asyncio.sleep(1)  # Poll every second
            except Exception as e:
                self.logger.logger.error(f"Error in ingest worker: {e}")
                await asyncio.sleep(5)  # Wait before retrying
    
    async def stop(self) -> None:
        """Stop the ingest worker"""
        self.logger.log_worker_stop()
        self.is_running = False
        
        # Close connections
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
        
        # Connect to ClamAV
        try:
            self.clamav_client = clamd.ClamdUnixSocket()
            self.clamav_client.ping()
        except Exception as e:
            self.logger.logger.warning(f"Could not connect to ClamAV: {e}")
            self.clamav_client = None
    
    async def _process_jobs(self) -> None:
        """Process ingest jobs from NATS"""
        try:
            # Subscribe to ingest jobs
            subscription = await self.nats_client.subscribe("jobs.ingest")
            
            async for msg in subscription.messages:
                try:
                    job_data = msg.data.decode()
                    job = IngestJob.parse_raw(job_data)
                    
                    await self._process_ingest_job(job)
                    
                    # Acknowledge message
                    await msg.ack()
                    
                except Exception as e:
                    self.logger.log_job_error(job.document_id, e)
                    self.failed_jobs += 1
                    await msg.nak()
        
        except Exception as e:
            self.logger.logger.error(f"Error processing jobs: {e}")
    
    async def _process_ingest_job(self, job: IngestJob) -> None:
        """Process a single ingest job"""
        start_time = time.time()
        job_id = str(job.document_id)
        
        self.logger.log_job_start(job_id, "ingest", document_id=job.document_id)
        
        try:
            # Download file from S3
            local_file = await self._download_file(job.file_path)
            
            # Virus scan
            await self._virus_scan(local_file)
            
            # Get file metadata
            metadata = await self._get_file_metadata(local_file, job.mime_type)
            
            # Extract text from PDF
            text_content = await self._extract_text(local_file, job.mime_type)
            
            # Update document status to ingested
            await self._update_document_status(job.document_id, "ingested", metadata)
            
            # Publish embed job
            await self._publish_embed_job(job.document_id, text_content)
            
            # Cleanup
            os.unlink(local_file)
            
            duration = time.time() - start_time
            self.logger.log_job_success(job_id, duration, document_id=job.document_id)
            self.processed_jobs += 1
            
        except Exception as e:
            # Update document status to failed
            await self._update_document_status(job.document_id, "failed", {"error": str(e)})
            raise
    
    async def _download_file(self, file_path: str) -> str:
        """Download file from S3 to local temp file"""
        try:
            # Create temp file
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
            temp_path = temp_file.name
            temp_file.close()
            
            # Download from S3
            self.s3_client.download_file(settings.S3_BUCKET, file_path, temp_path)
            
            return temp_path
            
        except ClientError as e:
            raise Exception(f"Failed to download file from S3: {e}")
    
    async def _virus_scan(self, file_path: str) -> None:
        """Scan file for viruses using ClamAV"""
        if not self.clamav_client:
            self.logger.logger.warning("ClamAV not available, skipping virus scan")
            return
        
        try:
            result = self.clamav_client.scan(file_path)
            if result and result[file_path][0] == 'FOUND':
                raise Exception(f"Virus detected: {result[file_path][1]}")
        except Exception as e:
            raise Exception(f"Virus scan failed: {e}")
    
    async def _get_file_metadata(self, file_path: str, mime_type: str) -> Dict[str, Any]:
        """Get file metadata including page count"""
        metadata = {}
        
        if mime_type == "application/pdf":
            try:
                # Use PyMuPDF to get page count
                doc = fitz.open(file_path)
                metadata["page_count"] = len(doc)
                metadata["file_size"] = os.path.getsize(file_path)
                doc.close()
            except Exception as e:
                self.logger.logger.warning(f"Could not get PDF metadata: {e}")
        
        return metadata
    
    async def _extract_text(self, file_path: str, mime_type: str) -> List[Dict[str, Any]]:
        """Extract text from PDF with OCR fallback"""
        if mime_type != "application/pdf":
            raise Exception(f"Unsupported mime type: {mime_type}")
        
        try:
            # Try to extract text using pdfminer
            text = extract_text(file_path, laparams=LAParams())
            
            if not text.strip():
                # No text found, try OCR
                if settings.ENABLE_OCR and self.ocr_reader:
                    text = await self._extract_text_with_ocr(file_path)
                else:
                    raise Exception("No text found and OCR is disabled")
            
            # Split text into pages
            pages = self._split_text_into_pages(text)
            
            return pages
            
        except Exception as e:
            raise Exception(f"Text extraction failed: {e}")
    
    async def _extract_text_with_ocr(self, file_path: str) -> str:
        """Extract text using OCR"""
        try:
            # Open PDF with PyMuPDF
            doc = fitz.open(file_path)
            text_parts = []
            
            for page_num in range(len(doc)):
                page = doc[page_num]
                
                # Convert page to image
                pix = page.get_pixmap()
                img_data = pix.tobytes("png")
                
                # Use EasyOCR to extract text
                results = self.ocr_reader.readtext(img_data)
                
                # Extract text from results
                page_text = " ".join([result[1] for result in results])
                text_parts.append(page_text)
            
            doc.close()
            return "\n\n".join(text_parts)
            
        except Exception as e:
            raise Exception(f"OCR extraction failed: {e}")
    
    def _split_text_into_pages(self, text: str) -> List[Dict[str, Any]]:
        """Split text into pages based on content"""
        # Simple page splitting - in practice, you might want more sophisticated logic
        paragraphs = text.split('\n\n')
        pages = []
        
        current_page = []
        current_length = 0
        max_page_length = 2000  # Approximate characters per page
        
        for paragraph in paragraphs:
            if current_length + len(paragraph) > max_page_length and current_page:
                pages.append({
                    "page_number": len(pages),
                    "content": "\n\n".join(current_page)
                })
                current_page = [paragraph]
                current_length = len(paragraph)
            else:
                current_page.append(paragraph)
                current_length += len(paragraph)
        
        # Add remaining content as last page
        if current_page:
            pages.append({
                "page_number": len(pages),
                "content": "\n\n".join(current_page)
            })
        
        return pages
    
    async def _update_document_status(self, document_id: str, status: str, metadata: Dict[str, Any]) -> None:
        """Update document status in database"""
        try:
            # This would update the document status in the database
            # Implementation depends on your database service
            pass
        except Exception as e:
            self.logger.logger.error(f"Failed to update document status: {e}")
    
    async def _publish_embed_job(self, document_id: str, text_content: List[Dict[str, Any]]) -> None:
        """Publish embed job to NATS"""
        try:
            embed_job = {
                "document_id": document_id,
                "chunks": text_content,
                "timestamp": time.time()
            }
            
            await self.nats_client.publish(
                "jobs.embed",
                str(embed_job).encode()
            )
            
        except Exception as e:
            self.logger.logger.error(f"Failed to publish embed job: {e}")
            raise
