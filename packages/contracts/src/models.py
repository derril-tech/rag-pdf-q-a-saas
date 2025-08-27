# Created automatically by Cursor AI (2025-01-27)

from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
from uuid import UUID

from pydantic import BaseModel, Field, validator


class DocumentStatus(str, Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    INGESTED = "ingested"
    EMBEDDED = "embedded"
    FAILED = "failed"


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ExportFormat(str, Enum):
    MARKDOWN = "markdown"
    JSON = "json"
    PDF = "pdf"


class PlanTier(str, Enum):
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"


# Base models
class BaseEntity(BaseModel):
    id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            UUID: lambda v: str(v),
        }


# Organization models
class Organization(BaseEntity):
    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=100, regex=r"^[a-z0-9-]+$")
    plan_tier: PlanTier = PlanTier.FREE
    settings: Dict[str, Any] = Field(default_factory=dict)


class CreateOrganizationRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=100, regex=r"^[a-z0-9-]+$")


class UpdateOrganizationRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    settings: Optional[Dict[str, Any]] = None


# User models
class User(BaseEntity):
    email: str = Field(..., regex=r"^[^@]+@[^@]+\.[^@]+$")
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    email_verified: bool = False


class CreateUserRequest(BaseModel):
    email: str = Field(..., regex=r"^[^@]+@[^@]+\.[^@]+$")
    name: Optional[str] = None
    avatar_url: Optional[str] = None


# Membership models
class Membership(BaseEntity):
    org_id: UUID
    user_id: UUID
    role: str = Field(default="member", min_length=1, max_length=50)


class CreateMembershipRequest(BaseModel):
    org_id: UUID
    user_id: UUID
    role: str = Field(default="member", min_length=1, max_length=50)


# Project models
class Project(BaseEntity):
    org_id: UUID
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    settings: Dict[str, Any] = Field(default_factory=dict)


class CreateProjectRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None


class UpdateProjectRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None


# Document models
class Document(BaseEntity):
    project_id: UUID
    name: str = Field(..., min_length=1, max_length=255)
    file_path: str
    file_size: int = Field(..., gt=0)
    mime_type: str = Field(..., min_length=1, max_length=100)
    page_count: Optional[int] = Field(None, gt=0)
    status: DocumentStatus = DocumentStatus.UPLOADED
    metadata: Dict[str, Any] = Field(default_factory=dict)


class CreateDocumentRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    file_path: str
    file_size: int = Field(..., gt=0)
    mime_type: str = Field(..., min_length=1, max_length=100)
    metadata: Optional[Dict[str, Any]] = None


class UpdateDocumentRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    metadata: Optional[Dict[str, Any]] = None


# Chunk models
class Chunk(BaseEntity):
    document_id: UUID
    page_number: int = Field(..., ge=0)
    chunk_index: int = Field(..., ge=0)
    content: str
    embedding: Optional[List[float]] = Field(None, min_items=1536, max_items=1536)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @validator('embedding')
    def validate_embedding_dimension(cls, v):
        if v is not None and len(v) != 1536:
            raise ValueError('Embedding must be 1536-dimensional (OpenAI standard)')
        return v


# Thread models
class Thread(BaseEntity):
    project_id: UUID
    title: Optional[str] = None
    created_by: Optional[UUID] = None


class CreateThreadRequest(BaseModel):
    title: Optional[str] = None


class UpdateThreadRequest(BaseModel):
    title: Optional[str] = None


# Message models
class Citation(BaseModel):
    document_id: UUID
    page_number: int = Field(..., ge=0)
    chunk_index: int = Field(..., ge=0)
    content: str
    score: float = Field(..., ge=0, le=1)


class Message(BaseEntity):
    thread_id: UUID
    role: MessageRole
    content: str
    citations: List[Citation] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class CreateMessageRequest(BaseModel):
    content: str
    citations: Optional[List[Citation]] = None
    metadata: Optional[Dict[str, Any]] = None


# QA models
class QARequest(BaseModel):
    query: str = Field(..., min_length=1)
    thread_id: Optional[UUID] = None
    project_id: Optional[UUID] = None
    document_ids: Optional[List[UUID]] = None
    max_results: int = Field(default=10, ge=1, le=20)
    temperature: float = Field(default=0.7, ge=0, le=2)


class QAResponse(BaseModel):
    answer: str
    citations: List[Citation]
    thread_id: Optional[UUID] = None
    message_id: Optional[UUID] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


# Usage stats models
class UsageStats(BaseEntity):
    org_id: UUID
    project_id: Optional[UUID] = None
    date: str = Field(..., regex=r"^\d{4}-\d{2}-\d{2}$")
    queries_count: int = Field(default=0, ge=0)
    tokens_used: int = Field(default=0, ge=0)
    documents_processed: int = Field(default=0, ge=0)


# Export models
class ExportRequest(BaseModel):
    format: ExportFormat
    thread_id: UUID


class ExportResponse(BaseModel):
    download_url: str
    expires_at: datetime
    format: ExportFormat
    size: int = Field(..., gt=0)


# Slack models
class SlackInstallRequest(BaseModel):
    code: str
    state: Optional[str] = None


class SlackEvent(BaseModel):
    type: str
    team_id: str
    event: Dict[str, Any]


class SlackAskRequest(BaseModel):
    text: str
    user_id: str
    team_id: str
    channel_id: str
    response_url: str


# Pagination models
class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)
    cursor: Optional[str] = None


class PaginationInfo(BaseModel):
    page: int = Field(..., ge=1)
    limit: int = Field(..., ge=1)
    total: int = Field(..., ge=0)
    has_more: bool
    cursor: Optional[str] = None


class PaginatedResponse(BaseModel):
    data: List[Any]
    pagination: PaginationInfo


# Error models
class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    error: ErrorDetail
    timestamp: datetime
    request_id: str


# API Response models
class APIResponse(BaseModel):
    data: Any
    timestamp: datetime
    request_id: str


# Worker job models
class IngestJob(BaseModel):
    document_id: UUID
    file_path: str
    mime_type: str
    file_size: int


class EmbedJob(BaseModel):
    document_id: UUID
    chunks: List[Dict[str, Any]]


class QAJob(BaseModel):
    query: str
    thread_id: Optional[UUID] = None
    project_id: Optional[UUID] = None
    document_ids: Optional[List[UUID]] = None
    user_id: Optional[UUID] = None


class ExportJob(BaseModel):
    thread_id: UUID
    format: ExportFormat
    user_id: Optional[UUID] = None


class SlackJob(BaseModel):
    event_type: str
    payload: Dict[str, Any]
    team_id: str
    user_id: Optional[str] = None
