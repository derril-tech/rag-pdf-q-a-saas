# Created automatically by Cursor AI (2025-01-27)

from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Application
    DEBUG: bool = False
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]
    
    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/rag_pdf_qa"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # NATS
    NATS_URL: str = "nats://localhost:4222"
    
    # S3/MinIO
    S3_ENDPOINT: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = "your-access-key"
    S3_SECRET_KEY: str = "your-secret-key"
    S3_BUCKET: str = "rag-pdf-qa-documents"
    S3_REGION: str = "us-east-1"
    S3_SECURE: bool = False
    
    # OpenAI
    OPENAI_API_KEY: str = "your-openai-api-key"
    OPENAI_MODEL: str = "gpt-4-turbo-preview"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-ada-002"
    
    # ClamAV
    CLAMAV_HOST: str = "localhost"
    CLAMAV_PORT: int = 3310
    
    # Worker settings
    WORKER_CONCURRENCY: int = 4
    WORKER_TIMEOUT: int = 300  # 5 minutes
    
    # Processing settings
    MAX_FILE_SIZE: int = 100 * 1024 * 1024  # 100MB
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200
    
    # OCR settings
    ENABLE_OCR: bool = True
    OCR_LANGUAGES: List[str] = ["en"]
    
    # Rate limiting
    OPENAI_RATE_LIMIT: int = 100  # requests per minute
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
