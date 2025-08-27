# Created automatically by Cursor AI (2024-12-19)

import pytest
import os
import sys
from pathlib import Path
from unittest.mock import Mock, patch


# Add app directory to Python path
app_dir = Path(__file__).parent.parent / "app"
sys.path.insert(0, str(app_dir))


@pytest.fixture
def mock_openai():
    """Mock OpenAI client for testing"""
    with patch('app.services.embedding_service.openai') as mock:
        # Mock embedding response
        mock_response = Mock()
        mock_response.data = [Mock(embedding=[0.1, 0.2, 0.3] * 33)]  # 99-dim vector
        mock.Embedding.create.return_value = mock_response
        yield mock


@pytest.fixture
def mock_redis():
    """Mock Redis client for testing"""
    with patch('app.services.cache_service.redis') as mock:
        mock.get.return_value = None
        mock.set.return_value = True
        mock.delete.return_value = 1
        yield mock


@pytest.fixture
def mock_postgres():
    """Mock PostgreSQL connection for testing"""
    with patch('app.services.database_service.postgresql') as mock:
        mock.connect.return_value = Mock()
        yield mock


@pytest.fixture
def sample_document():
    """Sample document for testing"""
    return {
        "id": "doc_123",
        "filename": "test_document.pdf",
        "content": "This is a test document with sample content.",
        "metadata": {
            "source": "test_document.pdf",
            "page": 1,
            "size": 1024,
            "uploaded_at": "2023-12-19T10:00:00Z"
        }
    }


@pytest.fixture
def sample_chunks():
    """Sample document chunks for testing"""
    return [
        Mock(
            text="This is the first chunk with important information.",
            metadata={
                "source": "document1.pdf",
                "page": 1,
                "chunk_index": 0,
                "total_chunks": 5
            }
        ),
        Mock(
            text="This is the second chunk with more details.",
            metadata={
                "source": "document1.pdf",
                "page": 1,
                "chunk_index": 1,
                "total_chunks": 5
            }
        ),
        Mock(
            text="This is from a different document.",
            metadata={
                "source": "document2.pdf",
                "page": 3,
                "chunk_index": 2,
                "total_chunks": 8
            }
        )
    ]


@pytest.fixture
def sample_qa_job():
    """Sample QA job for testing"""
    return {
        "id": "qa_123",
        "query": "What is the main topic of the document?",
        "document_id": "doc_123",
        "user_id": "user_456",
        "status": "pending",
        "created_at": "2023-12-19T10:00:00Z"
    }


@pytest.fixture
def sample_export_job():
    """Sample export job for testing"""
    return {
        "id": "export_123",
        "document_id": "doc_123",
        "format": "pdf",
        "user_id": "user_456",
        "status": "pending",
        "created_at": "2023-12-19T10:00:00Z"
    }


@pytest.fixture
def sample_analytics_job():
    """Sample analytics job for testing"""
    return {
        "id": "analytics_123",
        "document_id": "doc_123",
        "analysis_type": "usage_stats",
        "user_id": "user_456",
        "status": "pending",
        "created_at": "2023-12-19T10:00:00Z"
    }


@pytest.fixture
def mock_env_vars():
    """Mock environment variables for testing"""
    env_vars = {
        "OPENAI_API_KEY": "test_openai_key",
        "REDIS_URL": "redis://localhost:6379",
        "POSTGRES_URL": "postgresql://localhost:5432/testdb",
        "SENTRY_DSN": "https://test@sentry.io/test",
        "PROMETHEUS_PORT": "9090",
        "OTEL_ENDPOINT": "http://localhost:4318/v1/traces"
    }
    
    with patch.dict(os.environ, env_vars):
        yield env_vars


@pytest.fixture
def mock_telemetry():
    """Mock telemetry service for testing"""
    with patch('app.services.telemetry.telemetry_service') as mock:
        mock.create_span.return_value = Mock()
        mock.start_span.return_value = Mock()
        mock.end_span.return_value = None
        yield mock


@pytest.fixture
def mock_metrics():
    """Mock metrics service for testing"""
    with patch('app.services.metrics.metrics_service') as mock:
        mock.record_counter.return_value = None
        mock.record_histogram.return_value = None
        mock.set_gauge.return_value = None
        yield mock


@pytest.fixture
def mock_sentry():
    """Mock Sentry service for testing"""
    with patch('app.services.sentry.sentry_service') as mock:
        mock.capture_exception.return_value = "event_id_123"
        mock.capture_message.return_value = "event_id_456"
        mock.add_breadcrumb.return_value = None
        yield mock


@pytest.fixture
def mock_storage():
    """Mock storage service for testing"""
    with patch('app.services.storage.storage_service') as mock:
        mock.upload_file.return_value = "s3://bucket/file.pdf"
        mock.generate_signed_url.return_value = "https://s3.amazonaws.com/signed-url"
        mock.download_file.return_value = b"file content"
        yield mock


@pytest.fixture
def mock_guardrails():
    """Mock guardrails service for testing"""
    with patch('app.services.guardrails.guardrails_service') as mock:
        mock.filter_content.return_value = True
        mock.check_query_safety.return_value = True
        mock.check_response_safety.return_value = True
        mock.detect_pii.return_value = []
        yield mock


# Test markers
def pytest_configure(config):
    """Configure pytest with custom markers"""
    config.addinivalue_line(
        "markers", "unit: mark test as a unit test"
    )
    config.addinivalue_line(
        "markers", "integration: mark test as an integration test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )
    config.addinivalue_line(
        "markers", "external: mark test as requiring external services"
    )


# Test collection hooks
def pytest_collection_modifyitems(config, items):
    """Modify test collection to add markers based on file location"""
    for item in items:
        # Mark tests in unit directory as unit tests
        if "unit" in str(item.fspath):
            item.add_marker(pytest.mark.unit)
        
        # Mark tests in integration directory as integration tests
        if "integration" in str(item.fspath):
            item.add_marker(pytest.mark.integration)
        
        # Mark tests with external dependencies
        if any(keyword in item.name for keyword in ["openai", "redis", "postgres", "s3"]):
            item.add_marker(pytest.mark.external)


# Test reporting
def pytest_terminal_summary(terminalreporter, exitstatus, config):
    """Add custom summary information"""
    print("\n" + "="*50)
    print("TEST SUMMARY")
    print("="*50)
    
    # Show test results
    passed = len(terminalreporter.stats.get('passed', []))
    failed = len(terminalreporter.stats.get('failed', []))
    skipped = len(terminalreporter.stats.get('skipped', []))
    
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Skipped: {skipped}")
    print(f"Total: {passed + failed + skipped}")
    
    # Show coverage if available
    if hasattr(terminalreporter, '_tw'):
        print("\nCoverage reports generated:")
        print("- HTML: htmlcov/index.html")
        print("- XML: coverage.xml")
        print("- JUnit: test-results.xml")
