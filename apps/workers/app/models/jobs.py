# Created automatically by Cursor AI (2025-01-27)

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from uuid import UUID


class IngestJob(BaseModel):
    """Job for ingesting a document"""
    document_id: UUID
    file_path: str
    mime_type: str
    file_size: int


class EmbedJob(BaseModel):
    """Job for embedding document chunks"""
    document_id: UUID
    chunks: List[Dict[str, Any]]


class QAJob(BaseModel):
    """Job for processing a QA request"""
    query: str
    thread_id: Optional[UUID] = None
    project_id: Optional[UUID] = None
    document_ids: Optional[List[UUID]] = None
    user_id: Optional[UUID] = None
    max_results: int = Field(default=10, ge=1, le=20)
    temperature: float = Field(default=0.7, ge=0, le=2)


class ExportJob(BaseModel):
    """Job for exporting a thread"""
    thread_id: UUID
    format: str  # markdown, json, pdf
    user_id: Optional[UUID] = None


class SlackJob(BaseModel):
    """Job for processing Slack events"""
    event_type: str
    payload: Dict[str, Any]
    team_id: str
    user_id: Optional[str] = None


class AnalyticsJob(BaseModel):
    """Job for processing analytics"""
    event_type: str
    data: Dict[str, Any]
    timestamp: float
