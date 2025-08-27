# Created automatically by Cursor AI (2025-01-27)

import asyncio
import time
from typing import Dict, Any, List

import nats
from nats.aio.client import Client as NATS
import redis.asyncio as redis

from app.core.config import settings
from app.core.logging import WorkerLogger
from app.models.jobs import ExportJob


class ExportWorker:
    """Worker for exporting threads"""
    
    def __init__(self):
        self.name = "export"
        self.logger = WorkerLogger(self.name)
        self.is_running = False
        self.processed_jobs = 0
        self.failed_jobs = 0
        
        # External services
        self.nats_client: NATS = None
        self.redis_client: redis.Redis = None
    
    async def start(self) -> None:
        """Start the export worker"""
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
                self.logger.logger.error(f"Error in export worker: {e}")
                await asyncio.sleep(5)
    
    async def stop(self) -> None:
        """Stop the export worker"""
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
        """Process export jobs from NATS"""
        try:
            # Subscribe to export jobs
            subscription = await self.nats_client.subscribe("jobs.export")
            
            async for msg in subscription.messages:
                try:
                    job_data = msg.data.decode()
                    job = ExportJob.parse_raw(job_data)
                    
                    await self._process_export_job(job)
                    
                    # Acknowledge message
                    await msg.ack()
                    
                except Exception as e:
                    self.logger.log_job_error(job.export_type, e)
                    self.failed_jobs += 1
                    await msg.nak()
        
        except Exception as e:
            self.logger.logger.error(f"Error processing jobs: {e}")
    
    async def _process_export_job(self, job: ExportJob) -> None:
        """Process a single export job"""
        start_time = time.time()
        job_id = f"export_{job.export_type}_{int(start_time)}"
        
        self.logger.log_job_start(job_id, "export", export_type=job.export_type, thread_id=job.thread_id)
        
        try:
            if job.export_type == "thread":
                await self._export_thread(job)
            elif job.export_type == "project":
                await self._export_project(job)
            elif job.export_type == "document":
                await self._export_document(job)
            else:
                self.logger.logger.warning(f"Unknown export type: {job.export_type}")
            
            duration = time.time() - start_time
            self.logger.log_job_success(job_id, duration, export_type=job.export_type)
            self.processed_jobs += 1
            
        except Exception as e:
            self.logger.log_job_error(job_id, e, export_type=job.export_type)
            raise
    
    async def _export_thread(self, job: ExportJob) -> None:
        """Export a thread with all messages"""
        try:
            # Fetch thread and messages from database
            thread_data = await self._fetch_thread_data(job.thread_id)
            if not thread_data:
                raise Exception(f"Thread {job.thread_id} not found")
            
            # Fetch all messages in the thread
            messages = await self._fetch_thread_messages(job.thread_id)
            
            # Prepare export data
            export_data = {
                "thread": thread_data,
                "messages": messages,
                "export_metadata": {
                    "export_type": "thread",
                    "exported_at": time.time(),
                    "format": job.format,
                    "include_citations": job.include_citations
                }
            }
            
            # Generate export file
            if job.format == "markdown":
                content = await self._render_to_markdown(export_data)
            elif job.format == "json":
                content = await self._render_to_json(export_data)
            elif job.format == "pdf":
                content = await self._render_to_pdf(export_data)
            else:
                raise Exception(f"Unsupported export format: {job.format}")
            
            # Store export file
            file_url = await self._store_export_file(job, content)
            
            # Generate signed URL for frontend access
            signed_url = await self._generate_signed_url(file_url)
            
            # Update job with result
            job.result = {
                "file_url": file_url, 
                "signed_url": signed_url,
                "file_size": len(content),
                "expires_at": time.time() + 3600  # 1 hour expiry
            }
            
        except Exception as e:
            raise Exception(f"Thread export failed: {e}")
    
    async def _export_project(self, job: ExportJob) -> None:
        """Export a project with all threads"""
        try:
            # Fetch project data
            project_data = await self._fetch_project_data(job.project_id)
            if not project_data:
                raise Exception(f"Project {job.project_id} not found")
            
            # Fetch all threads in the project
            threads = await self._fetch_project_threads(job.project_id)
            
            # Fetch messages for each thread
            all_messages = []
            for thread in threads:
                messages = await self._fetch_thread_messages(thread["id"])
                all_messages.extend(messages)
            
            # Prepare export data
            export_data = {
                "project": project_data,
                "threads": threads,
                "messages": all_messages,
                "export_metadata": {
                    "export_type": "project",
                    "exported_at": time.time(),
                    "format": job.format,
                    "include_citations": job.include_citations
                }
            }
            
            # Generate export file
            if job.format == "markdown":
                content = await self._render_to_markdown(export_data)
            elif job.format == "json":
                content = await self._render_to_json(export_data)
            elif job.format == "pdf":
                content = await self._render_to_pdf(export_data)
            else:
                raise Exception(f"Unsupported export format: {job.format}")
            
            # Store export file
            file_url = await self._store_export_file(job, content)
            
            # Generate signed URL for frontend access
            signed_url = await self._generate_signed_url(file_url)
            
            # Update job with result
            job.result = {
                "file_url": file_url, 
                "signed_url": signed_url,
                "file_size": len(content),
                "expires_at": time.time() + 3600  # 1 hour expiry
            }
            
        except Exception as e:
            raise Exception(f"Project export failed: {e}")
    
    async def _export_document(self, job: ExportJob) -> None:
        """Export a document with its chunks"""
        try:
            # Fetch document data
            document_data = await self._fetch_document_data(job.document_id)
            if not document_data:
                raise Exception(f"Document {job.document_id} not found")
            
            # Fetch all chunks for the document
            chunks = await self._fetch_document_chunks(job.document_id)
            
            # Prepare export data
            export_data = {
                "document": document_data,
                "chunks": chunks,
                "export_metadata": {
                    "export_type": "document",
                    "exported_at": time.time(),
                    "format": job.format,
                    "include_embeddings": job.include_embeddings
                }
            }
            
            # Generate export file
            if job.format == "markdown":
                content = await self._render_to_markdown(export_data)
            elif job.format == "json":
                content = await self._render_to_json(export_data)
            elif job.format == "pdf":
                content = await self._render_to_pdf(export_data)
            else:
                raise Exception(f"Unsupported export format: {job.format}")
            
            # Store export file
            file_url = await self._store_export_file(job, content)
            
            # Generate signed URL for frontend access
            signed_url = await self._generate_signed_url(file_url)
            
            # Update job with result
            job.result = {
                "file_url": file_url, 
                "signed_url": signed_url,
                "file_size": len(content),
                "expires_at": time.time() + 3600  # 1 hour expiry
            }
            
        except Exception as e:
            raise Exception(f"Document export failed: {e}")
    
    async def _fetch_thread_data(self, thread_id: str) -> dict:
        """Fetch thread data from database"""
        try:
            # This would query the database for thread data
            # Implementation depends on your database service
            return {
                "id": thread_id,
                "title": "Sample Thread",
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z"
            }
        except Exception as e:
            self.logger.logger.error(f"Failed to fetch thread data: {e}")
            return None
    
    async def _fetch_thread_messages(self, thread_id: str) -> list:
        """Fetch all messages in a thread"""
        try:
            # This would query the database for thread messages
            # Implementation depends on your database service
            return [
                {
                    "id": "msg1",
                    "role": "user",
                    "content": "What is the main topic?",
                    "created_at": "2024-01-01T00:00:00Z",
                    "citations": []
                },
                {
                    "id": "msg2",
                    "role": "assistant",
                    "content": "The main topic is...",
                    "created_at": "2024-01-01T00:01:00Z",
                    "citations": [{"document": "doc1", "page": 1}]
                }
            ]
        except Exception as e:
            self.logger.logger.error(f"Failed to fetch thread messages: {e}")
            return []
    
    async def _fetch_project_data(self, project_id: str) -> dict:
        """Fetch project data from database"""
        try:
            # This would query the database for project data
            # Implementation depends on your database service
            return {
                "id": project_id,
                "name": "Sample Project",
                "created_at": "2024-01-01T00:00:00Z"
            }
        except Exception as e:
            self.logger.logger.error(f"Failed to fetch project data: {e}")
            return None
    
    async def _fetch_project_threads(self, project_id: str) -> list:
        """Fetch all threads in a project"""
        try:
            # This would query the database for project threads
            # Implementation depends on your database service
            return [
                {
                    "id": "thread1",
                    "title": "Thread 1",
                    "created_at": "2024-01-01T00:00:00Z"
                }
            ]
        except Exception as e:
            self.logger.logger.error(f"Failed to fetch project threads: {e}")
            return []
    
    async def _fetch_document_data(self, document_id: str) -> dict:
        """Fetch document data from database"""
        try:
            # This would query the database for document data
            # Implementation depends on your database service
            return {
                "id": document_id,
                "name": "Sample Document",
                "status": "processed",
                "created_at": "2024-01-01T00:00:00Z"
            }
        except Exception as e:
            self.logger.logger.error(f"Failed to fetch document data: {e}")
            return None
    
    async def _fetch_document_chunks(self, document_id: str) -> list:
        """Fetch all chunks for a document"""
        try:
            # This would query the database for document chunks
            # Implementation depends on your database service
            return [
                {
                    "id": "chunk1",
                    "content": "Sample chunk content",
                    "page": 1,
                    "created_at": "2024-01-01T00:00:00Z"
                }
            ]
        except Exception as e:
            self.logger.logger.error(f"Failed to fetch document chunks: {e}")
            return []
    
    async def _store_export_file(self, job: ExportJob, content: str) -> str:
        """Store export file and return URL"""
        try:
            from app.services.storage import StorageService
            
            # Initialize storage service
            storage_service = StorageService()
            
            # Determine file extension
            format_extensions = {
                "markdown": "md",
                "html": "html", 
                "json": "json",
                "pdf": "pdf"
            }
            file_extension = format_extensions.get(job.format, "txt")
            
            # Upload artifact to S3
            url = await storage_service.upload_export_artifact(job, content, file_extension)
            
            return url
            
        except Exception as e:
            self.logger.logger.error(f"Failed to store export file: {e}")
            raise
    
    async def _generate_signed_url(self, file_url: str) -> str:
        """Generate a signed URL for frontend access"""
        try:
            from app.services.storage import StorageService
            
            # Initialize storage service
            storage_service = StorageService()
            
            # Extract file path from URL
            # Assuming URL format: https://storage.example.com/files/path/to/file
            file_path = file_url.replace("https://storage.example.com/files/", "")
            
            # Generate signed URL with 1 hour expiry
            signed_url = await storage_service.generate_signed_url(file_path, expires_in=3600)
            
            return signed_url
            
        except Exception as e:
            self.logger.logger.error(f"Failed to generate signed URL: {e}")
            # Return original URL as fallback
            return file_url
    
    async def _render_to_markdown(self, export_data: dict) -> str:
        """Render export data to Markdown format"""
        try:
            import datetime
            
            export_type = export_data["export_metadata"]["export_type"]
            exported_at = datetime.datetime.fromtimestamp(export_data["export_metadata"]["exported_at"]).strftime("%Y-%m-%d %H:%M:%S")
            
            markdown = []
            
            # Header
            markdown.append(f"# {export_type.title()} Export")
            markdown.append(f"*Exported on: {exported_at}*")
            markdown.append("")
            
            if export_type == "thread":
                markdown.extend(self._render_thread_markdown(export_data))
            elif export_type == "project":
                markdown.extend(self._render_project_markdown(export_data))
            elif export_type == "document":
                markdown.extend(self._render_document_markdown(export_data))
            
            return "\n".join(markdown)
            
        except Exception as e:
            self.logger.logger.error(f"Failed to render markdown: {e}")
            raise
    
    def _render_thread_markdown(self, export_data: dict) -> list:
        """Render thread data to markdown"""
        lines = []
        
        thread = export_data["thread"]
        messages = export_data["messages"]
        include_citations = export_data["export_metadata"]["include_citations"]
        
        # Thread info
        lines.append(f"## Thread: {thread.get('title', 'Untitled')}")
        lines.append(f"**Created:** {thread.get('created_at', 'Unknown')}")
        lines.append(f"**Updated:** {thread.get('updated_at', 'Unknown')}")
        lines.append("")
        
        # Messages
        lines.append("## Messages")
        lines.append("")
        
        for i, message in enumerate(messages, 1):
            role = message.get("role", "unknown")
            content = message.get("content", "")
            created_at = message.get("created_at", "Unknown")
            citations = message.get("citations", [])
            
            # Message header
            lines.append(f"### {i}. {role.title()} Message")
            lines.append(f"*{created_at}*")
            lines.append("")
            
            # Message content
            lines.append(content)
            lines.append("")
            
            # Citations
            if include_citations and citations:
                lines.append("**Citations:**")
                for citation in citations:
                    doc_name = citation.get("document", "Unknown Document")
                    page = citation.get("page", "Unknown Page")
                    lines.append(f"- {doc_name}, Page {page}")
                lines.append("")
            
            lines.append("---")
            lines.append("")
        
        return lines
    
    def _render_project_markdown(self, export_data: dict) -> list:
        """Render project data to markdown"""
        lines = []
        
        project = export_data["project"]
        threads = export_data["threads"]
        messages = export_data["messages"]
        include_citations = export_data["export_metadata"]["include_citations"]
        
        # Project info
        lines.append(f"## Project: {project.get('name', 'Untitled')}")
        lines.append(f"**Created:** {project.get('created_at', 'Unknown')}")
        lines.append("")
        
        # Threads summary
        lines.append(f"## Threads ({len(threads)})")
        lines.append("")
        
        for thread in threads:
            lines.append(f"- **{thread.get('title', 'Untitled')}** ({thread.get('created_at', 'Unknown')})")
        lines.append("")
        
        # All messages
        lines.append("## All Messages")
        lines.append("")
        
        for i, message in enumerate(messages, 1):
            role = message.get("role", "unknown")
            content = message.get("content", "")
            created_at = message.get("created_at", "Unknown")
            citations = message.get("citations", [])
            
            # Message header
            lines.append(f"### {i}. {role.title()} Message")
            lines.append(f"*{created_at}*")
            lines.append("")
            
            # Message content
            lines.append(content)
            lines.append("")
            
            # Citations
            if include_citations and citations:
                lines.append("**Citations:**")
                for citation in citations:
                    doc_name = citation.get("document", "Unknown Document")
                    page = citation.get("page", "Unknown Page")
                    lines.append(f"- {doc_name}, Page {page}")
                lines.append("")
            
            lines.append("---")
            lines.append("")
        
        return lines
    
    def _render_document_markdown(self, export_data: dict) -> list:
        """Render document data to markdown"""
        lines = []
        
        document = export_data["document"]
        chunks = export_data["chunks"]
        include_embeddings = export_data["export_metadata"]["include_embeddings"]
        
        # Document info
        lines.append(f"## Document: {document.get('name', 'Untitled')}")
        lines.append(f"**Status:** {document.get('status', 'Unknown')}")
        lines.append(f"**Created:** {document.get('created_at', 'Unknown')}")
        lines.append("")
        
        # Chunks
        lines.append(f"## Chunks ({len(chunks)})")
        lines.append("")
        
        for i, chunk in enumerate(chunks, 1):
            content = chunk.get("content", "")
            page = chunk.get("page", "Unknown")
            created_at = chunk.get("created_at", "Unknown")
            
            lines.append(f"### Chunk {i} (Page {page})")
            lines.append(f"*{created_at}*")
            lines.append("")
            lines.append(content)
            lines.append("")
            
            if include_embeddings and chunk.get("embedding"):
                lines.append("*[Embedding data included]*")
                lines.append("")
            
            lines.append("---")
            lines.append("")
        
        return lines
    
    async def _render_to_json(self, export_data: dict) -> str:
        """Render export data to JSON format"""
        try:
            import json
            import datetime
            
            # Create a complete JSON bundle with metadata
            bundle = {
                "metadata": {
                    "version": "1.0.0",
                    "export_type": export_data["export_metadata"]["export_type"],
                    "exported_at": datetime.datetime.now().isoformat(),
                    "format": "json",
                    "generator": "RAG PDF Q&A Export Worker"
                },
                "data": export_data,
                "schema": {
                    "thread": {
                        "id": "string",
                        "title": "string", 
                        "created_at": "datetime",
                        "updated_at": "datetime"
                    },
                    "message": {
                        "id": "string",
                        "role": "enum(user,assistant)",
                        "content": "string",
                        "created_at": "datetime",
                        "citations": "array"
                    },
                    "project": {
                        "id": "string",
                        "name": "string",
                        "created_at": "datetime"
                    },
                    "document": {
                        "id": "string",
                        "name": "string",
                        "status": "enum(processing,processed,failed)",
                        "created_at": "datetime"
                    },
                    "chunk": {
                        "id": "string",
                        "content": "string",
                        "page": "integer",
                        "created_at": "datetime"
                    }
                }
            }
            
            # Pretty print JSON
            return json.dumps(bundle, indent=2, default=str)
            
        except Exception as e:
            self.logger.logger.error(f"Failed to render JSON: {e}")
            raise
    
    async def _render_to_pdf(self, export_data: dict) -> str:
        """Render export data to PDF format"""
        try:
            # First render to HTML
            html_content = await self._render_to_html(export_data)
            
            # Convert HTML to PDF using weasyprint
            try:
                from weasyprint import HTML, CSS
                from weasyprint.text.fonts import FontConfiguration
                
                # Configure fonts
                font_config = FontConfiguration()
                
                # Create PDF from HTML
                html_doc = HTML(string=html_content)
                css = CSS(string=self._get_pdf_css(), font_config=font_config)
                
                # Generate PDF
                pdf_bytes = html_doc.write_pdf(stylesheets=[css], font_config=font_config)
                
                return pdf_bytes
                
            except ImportError:
                # Fallback: return HTML content if weasyprint not available
                self.logger.logger.warning("weasyprint not available, returning HTML content")
                return html_content
            
        except Exception as e:
            self.logger.logger.error(f"Failed to render PDF: {e}")
            raise
    
    async def _render_to_html(self, export_data: dict) -> str:
        """Render export data to HTML format"""
        try:
            import datetime
            
            export_type = export_data["export_metadata"]["export_type"]
            exported_at = datetime.datetime.fromtimestamp(export_data["export_metadata"]["exported_at"]).strftime("%Y-%m-%d %H:%M:%S")
            
            html_parts = []
            
            # HTML header
            html_parts.append("<!DOCTYPE html>")
            html_parts.append("<html lang='en'>")
            html_parts.append("<head>")
            html_parts.append("    <meta charset='UTF-8'>")
            html_parts.append("    <meta name='viewport' content='width=device-width, initial-scale=1.0'>")
            html_parts.append(f"    <title>{export_type.title()} Export</title>")
            html_parts.append("    <style>")
            html_parts.append(self._get_html_css())
            html_parts.append("    </style>")
            html_parts.append("</head>")
            html_parts.append("<body>")
            
            # Content
            html_parts.append(f"    <div class='container'>")
            html_parts.append(f"        <h1>{export_type.title()} Export</h1>")
            html_parts.append(f"        <p class='export-date'>Exported on: {exported_at}</p>")
            
            if export_type == "thread":
                html_parts.extend(self._render_thread_html(export_data))
            elif export_type == "project":
                html_parts.extend(self._render_project_html(export_data))
            elif export_type == "document":
                html_parts.extend(self._render_document_html(export_data))
            
            html_parts.append("    </div>")
            html_parts.append("</body>")
            html_parts.append("</html>")
            
            return "\n".join(html_parts)
            
        except Exception as e:
            self.logger.logger.error(f"Failed to render HTML: {e}")
            raise
    
    def _render_thread_html(self, export_data: dict) -> list:
        """Render thread data to HTML"""
        lines = []
        
        thread = export_data["thread"]
        messages = export_data["messages"]
        include_citations = export_data["export_metadata"]["include_citations"]
        
        # Thread info
        lines.append("        <div class='thread-info'>")
        lines.append(f"            <h2>Thread: {thread.get('title', 'Untitled')}</h2>")
        lines.append(f"            <p><strong>Created:</strong> {thread.get('created_at', 'Unknown')}</p>")
        lines.append(f"            <p><strong>Updated:</strong> {thread.get('updated_at', 'Unknown')}</p>")
        lines.append("        </div>")
        
        # Messages
        lines.append("        <div class='messages'>")
        lines.append("            <h2>Messages</h2>")
        
        for i, message in enumerate(messages, 1):
            role = message.get("role", "unknown")
            content = message.get("content", "")
            created_at = message.get("created_at", "Unknown")
            citations = message.get("citations", [])
            
            # Message container
            lines.append(f"            <div class='message {role}'>")
            lines.append(f"                <div class='message-header'>")
            lines.append(f"                    <h3>{i}. {role.title()} Message</h3>")
            lines.append(f"                    <span class='timestamp'>{created_at}</span>")
            lines.append("                </div>")
            
            # Message content
            lines.append("                <div class='message-content'>")
            lines.append(f"                    {content}")
            lines.append("                </div>")
            
            # Citations
            if include_citations and citations:
                lines.append("                <div class='citations'>")
                lines.append("                    <h4>Citations:</h4>")
                lines.append("                    <ul>")
                for citation in citations:
                    doc_name = citation.get("document", "Unknown Document")
                    page = citation.get("page", "Unknown Page")
                    lines.append(f"                        <li>{doc_name}, Page {page}</li>")
                lines.append("                    </ul>")
                lines.append("                </div>")
            
            lines.append("            </div>")
        
        lines.append("        </div>")
        
        return lines
    
    def _render_project_html(self, export_data: dict) -> list:
        """Render project data to HTML"""
        lines = []
        
        project = export_data["project"]
        threads = export_data["threads"]
        messages = export_data["messages"]
        include_citations = export_data["export_metadata"]["include_citations"]
        
        # Project info
        lines.append("        <div class='project-info'>")
        lines.append(f"            <h2>Project: {project.get('name', 'Untitled')}</h2>")
        lines.append(f"            <p><strong>Created:</strong> {project.get('created_at', 'Unknown')}</p>")
        lines.append("        </div>")
        
        # Threads summary
        lines.append("        <div class='threads-summary'>")
        lines.append(f"            <h2>Threads ({len(threads)})</h2>")
        lines.append("            <ul>")
        for thread in threads:
            lines.append(f"                <li><strong>{thread.get('title', 'Untitled')}</strong> ({thread.get('created_at', 'Unknown')})</li>")
        lines.append("            </ul>")
        lines.append("        </div>")
        
        # All messages
        lines.append("        <div class='messages'>")
        lines.append("            <h2>All Messages</h2>")
        
        for i, message in enumerate(messages, 1):
            role = message.get("role", "unknown")
            content = message.get("content", "")
            created_at = message.get("created_at", "Unknown")
            citations = message.get("citations", [])
            
            # Message container
            lines.append(f"            <div class='message {role}'>")
            lines.append(f"                <div class='message-header'>")
            lines.append(f"                    <h3>{i}. {role.title()} Message</h3>")
            lines.append(f"                    <span class='timestamp'>{created_at}</span>")
            lines.append("                </div>")
            
            # Message content
            lines.append("                <div class='message-content'>")
            lines.append(f"                    {content}")
            lines.append("                </div>")
            
            # Citations
            if include_citations and citations:
                lines.append("                <div class='citations'>")
                lines.append("                    <h4>Citations:</h4>")
                lines.append("                    <ul>")
                for citation in citations:
                    doc_name = citation.get("document", "Unknown Document")
                    page = citation.get("page", "Unknown Page")
                    lines.append(f"                        <li>{doc_name}, Page {page}</li>")
                lines.append("                    </ul>")
                lines.append("                </div>")
            
            lines.append("            </div>")
        
        lines.append("        </div>")
        
        return lines
    
    def _render_document_html(self, export_data: dict) -> list:
        """Render document data to HTML"""
        lines = []
        
        document = export_data["document"]
        chunks = export_data["chunks"]
        include_embeddings = export_data["export_metadata"]["include_embeddings"]
        
        # Document info
        lines.append("        <div class='document-info'>")
        lines.append(f"            <h2>Document: {document.get('name', 'Untitled')}</h2>")
        lines.append(f"            <p><strong>Status:</strong> {document.get('status', 'Unknown')}</p>")
        lines.append(f"            <p><strong>Created:</strong> {document.get('created_at', 'Unknown')}</p>")
        lines.append("        </div>")
        
        # Chunks
        lines.append("        <div class='chunks'>")
        lines.append(f"            <h2>Chunks ({len(chunks)})</h2>")
        
        for i, chunk in enumerate(chunks, 1):
            content = chunk.get("content", "")
            page = chunk.get("page", "Unknown")
            created_at = chunk.get("created_at", "Unknown")
            
            lines.append(f"            <div class='chunk'>")
            lines.append(f"                <div class='chunk-header'>")
            lines.append(f"                    <h3>Chunk {i} (Page {page})</h3>")
            lines.append(f"                    <span class='timestamp'>{created_at}</span>")
            lines.append("                </div>")
            
            lines.append("                <div class='chunk-content'>")
            lines.append(f"                    {content}")
            lines.append("                </div>")
            
            if include_embeddings and chunk.get("embedding"):
                lines.append("                <div class='embedding-info'>")
                lines.append("                    <em>[Embedding data included]</em>")
                lines.append("                </div>")
            
            lines.append("            </div>")
        
        lines.append("        </div>")
        
        return lines
    
    def _get_html_css(self) -> str:
        """Get CSS styles for HTML export"""
        return """
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f9f9f9;
            }
            
            .container {
                background-color: white;
                padding: 30px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            
            h1 {
                color: #2c3e50;
                border-bottom: 3px solid #3498db;
                padding-bottom: 10px;
            }
            
            h2 {
                color: #34495e;
                margin-top: 30px;
                border-bottom: 2px solid #ecf0f1;
                padding-bottom: 5px;
            }
            
            h3 {
                color: #7f8c8d;
                margin-top: 20px;
            }
            
            .export-date {
                color: #7f8c8d;
                font-style: italic;
                margin-bottom: 30px;
            }
            
            .message {
                margin: 20px 0;
                padding: 15px;
                border-radius: 8px;
                border-left: 4px solid #3498db;
            }
            
            .message.user {
                background-color: #f8f9fa;
                border-left-color: #28a745;
            }
            
            .message.assistant {
                background-color: #e3f2fd;
                border-left-color: #2196f3;
            }
            
            .message-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            
            .timestamp {
                color: #7f8c8d;
                font-size: 0.9em;
            }
            
            .message-content {
                margin-bottom: 10px;
            }
            
            .citations {
                background-color: #f8f9fa;
                padding: 10px;
                border-radius: 4px;
                margin-top: 10px;
            }
            
            .citations h4 {
                margin: 0 0 10px 0;
                color: #495057;
            }
            
            .citations ul {
                margin: 0;
                padding-left: 20px;
            }
            
            .chunk {
                margin: 20px 0;
                padding: 15px;
                border: 1px solid #dee2e6;
                border-radius: 8px;
                background-color: #f8f9fa;
            }
            
            .chunk-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            
            .chunk-content {
                margin-bottom: 10px;
            }
            
            .embedding-info {
                color: #6c757d;
                font-size: 0.9em;
            }
            
            ul {
                padding-left: 20px;
            }
            
            li {
                margin: 5px 0;
            }
        """
    
    def _get_pdf_css(self) -> str:
        """Get CSS styles for PDF export"""
        return """
            @page {
                size: A4;
                margin: 2cm;
                @top-center {
                    content: "RAG PDF Q&A Export";
                    font-size: 10pt;
                    color: #666;
                }
                @bottom-center {
                    content: "Page " counter(page) " of " counter(pages);
                    font-size: 10pt;
                    color: #666;
                }
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                font-size: 11pt;
            }
            
            h1 {
                color: #2c3e50;
                border-bottom: 2px solid #3498db;
                padding-bottom: 10px;
                page-break-after: avoid;
            }
            
            h2 {
                color: #34495e;
                margin-top: 20px;
                page-break-after: avoid;
            }
            
            h3 {
                color: #7f8c8d;
                margin-top: 15px;
                page-break-after: avoid;
            }
            
            .export-date {
                color: #7f8c8d;
                font-style: italic;
                margin-bottom: 20px;
            }
            
            .message {
                margin: 15px 0;
                padding: 10px;
                border-left: 3px solid #3498db;
                page-break-inside: avoid;
            }
            
            .message.user {
                background-color: #f8f9fa;
                border-left-color: #28a745;
            }
            
            .message.assistant {
                background-color: #e3f2fd;
                border-left-color: #2196f3;
            }
            
            .message-header {
                margin-bottom: 8px;
            }
            
            .timestamp {
                color: #7f8c8d;
                font-size: 0.9em;
            }
            
            .citations {
                background-color: #f8f9fa;
                padding: 8px;
                margin-top: 8px;
                font-size: 0.9em;
            }
            
            .chunk {
                margin: 15px 0;
                padding: 10px;
                border: 1px solid #dee2e6;
                background-color: #f8f9fa;
                page-break-inside: avoid;
            }
            
            ul {
                padding-left: 15px;
            }
            
            li {
                margin: 3px 0;
            }
        """
