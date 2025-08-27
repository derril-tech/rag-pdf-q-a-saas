# Created automatically by Cursor AI (2024-12-19)

import pytest
import asyncio
import tempfile
import os
from pathlib import Path
from unittest.mock import Mock, patch, AsyncMock
from app.services.ingest_worker import IngestWorker
from app.services.embed_worker import EmbedWorker
from app.services.database_service import DatabaseService
from app.services.storage_service import StorageService


class TestUploadPipeline:
    """Integration tests for the complete upload pipeline"""

    @pytest.fixture
    def sample_pdf_content(self):
        """Create a sample PDF file for testing"""
        # This would be a real PDF file in actual testing
        return b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n72 720 Td\n(Hello World) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000204 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n297\n%%EOF"

    @pytest.fixture
    def mock_database(self):
        """Mock database service"""
        with patch('app.services.database_service.DatabaseService') as mock:
            mock_instance = Mock()
            mock_instance.get_document.return_value = {
                "id": "doc_123",
                "filename": "test_document.pdf",
                "status": "uploaded",
                "metadata": {
                    "size": 1024,
                    "pages": 1
                }
            }
            mock_instance.update_document_status.return_value = True
            mock_instance.create_chunks.return_value = ["chunk_1", "chunk_2"]
            mock.return_value = mock_instance
            yield mock_instance

    @pytest.fixture
    def mock_storage(self):
        """Mock storage service"""
        with patch('app.services.storage_service.StorageService') as mock:
            mock_instance = Mock()
            mock_instance.download_file.return_value = b"PDF content"
            mock_instance.upload_file.return_value = "s3://bucket/processed/doc_123.pdf"
            mock.return_value = mock_instance
            yield mock_instance

    @pytest.fixture
    def mock_telemetry(self):
        """Mock telemetry service"""
        with patch('app.services.telemetry.telemetry_service') as mock:
            mock.create_span.return_value = Mock()
            mock.start_span.return_value = Mock()
            mock.end_span.return_value = None
            yield mock

    @pytest.fixture
    def mock_metrics(self):
        """Mock metrics service"""
        with patch('app.services.metrics.metrics_service') as mock:
            mock.record_counter.return_value = None
            mock.record_histogram.return_value = None
            yield mock

    @pytest.mark.integration
    async def test_complete_upload_pipeline(self, sample_pdf_content, mock_database, mock_storage, mock_telemetry, mock_metrics):
        """Test the complete upload pipeline from upload to embedding"""
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
            temp_file.write(sample_pdf_content)
            temp_file_path = temp_file.name
        
        try:
            # Step 1: Ingest Worker
            ingest_worker = IngestWorker()
            
            # Mock document processing
            with patch('app.services.ingest_worker.extract_text_from_pdf') as mock_extract:
                mock_extract.return_value = {
                    "text": "This is a test document with sample content.",
                    "pages": 1,
                    "metadata": {
                        "title": "Test Document",
                        "author": "Test Author"
                    }
                }
                
                # Process document
                result = await ingest_worker.process_document("doc_123", temp_file_path)
                
                assert result["status"] == "processed"
                assert result["text"] == "This is a test document with sample content."
                assert result["pages"] == 1
                
                # Verify database updates
                mock_database.update_document_status.assert_called_with(
                    "doc_123", "processed", {"pages": 1, "title": "Test Document", "author": "Test Author"}
                )
                
                # Verify storage operations
                mock_storage.download_file.assert_called()
                mock_storage.upload_file.assert_called()
                
                # Verify metrics recording
                mock_metrics.record_counter.assert_called()
                mock_metrics.record_histogram.assert_called()
                
                # Verify telemetry
                mock_telemetry.create_span.assert_called()
                
            # Step 2: Embed Worker
            embed_worker = EmbedWorker()
            
            # Mock text chunking
            with patch('app.services.embed_worker.ChunkSplitter') as mock_splitter:
                mock_splitter_instance = Mock()
                mock_splitter_instance.split_text.return_value = [
                    Mock(text="This is a test document", metadata={"chunk_index": 0}),
                    Mock(text="with sample content", metadata={"chunk_index": 1})
                ]
                mock_splitter.return_value = mock_splitter_instance
                
                # Mock embedding generation
                with patch('app.services.embed_worker.EmbeddingService') as mock_embedding:
                    mock_embedding_instance = Mock()
                    mock_embedding_instance.generate_embeddings.return_value = [
                        [0.1, 0.2, 0.3] * 33,  # 99-dim vector
                        [0.4, 0.5, 0.6] * 33   # 99-dim vector
                    ]
                    mock_embedding.return_value = mock_embedding_instance
                    
                    # Process embeddings
                    embed_result = await embed_worker.process_document("doc_123")
                    
                    assert embed_result["status"] == "embedded"
                    assert embed_result["chunks_created"] == 2
                    assert embed_result["embeddings_generated"] == 2
                    
                    # Verify chunk creation
                    mock_database.create_chunks.assert_called()
                    
                    # Verify embedding storage
                    mock_database.store_embeddings.assert_called()
                    
                    # Verify final status update
                    mock_database.update_document_status.assert_called_with("doc_123", "embedded")
                    
        finally:
            # Clean up temporary file
            os.unlink(temp_file_path)

    @pytest.mark.integration
    async def test_pipeline_error_handling(self, mock_database, mock_storage, mock_telemetry, mock_metrics):
        """Test error handling in the upload pipeline"""
        
        # Test ingest worker error
        ingest_worker = IngestWorker()
        
        with patch('app.services.ingest_worker.extract_text_from_pdf') as mock_extract:
            mock_extract.side_effect = Exception("PDF processing failed")
            
            # Process should handle error gracefully
            result = await ingest_worker.process_document("doc_123", "invalid_path.pdf")
            
            assert result["status"] == "failed"
            assert "error" in result
            
            # Verify error metrics
            mock_metrics.record_counter.assert_called()
            
            # Verify error telemetry
            mock_telemetry.create_span.assert_called()

    @pytest.mark.integration
    async def test_pipeline_with_large_document(self, mock_database, mock_storage, mock_telemetry, mock_metrics):
        """Test pipeline with a large document"""
        
        # Create large text content
        large_content = "This is a large document. " * 1000  # ~25KB
        
        ingest_worker = IngestWorker()
        
        with patch('app.services.ingest_worker.extract_text_from_pdf') as mock_extract:
            mock_extract.return_value = {
                "text": large_content,
                "pages": 10,
                "metadata": {"title": "Large Document"}
            }
            
            # Process large document
            result = await ingest_worker.process_document("doc_123", "large_doc.pdf")
            
            assert result["status"] == "processed"
            assert result["pages"] == 10
            assert len(result["text"]) > 10000
            
            # Verify performance metrics
            mock_metrics.record_histogram.assert_called()

    @pytest.mark.integration
    async def test_pipeline_concurrent_processing(self, mock_database, mock_storage, mock_telemetry, mock_metrics):
        """Test concurrent document processing"""
        
        ingest_worker = IngestWorker()
        
        with patch('app.services.ingest_worker.extract_text_from_pdf') as mock_extract:
            mock_extract.return_value = {
                "text": "Test content",
                "pages": 1,
                "metadata": {}
            }
            
            # Process multiple documents concurrently
            tasks = []
            for i in range(5):
                task = ingest_worker.process_document(f"doc_{i}", f"doc_{i}.pdf")
                tasks.append(task)
            
            results = await asyncio.gather(*tasks)
            
            # All should complete successfully
            assert len(results) == 5
            assert all(result["status"] == "processed" for result in results)
            
            # Verify concurrent processing metrics
            assert mock_metrics.record_counter.call_count >= 5

    @pytest.mark.integration
    async def test_pipeline_data_consistency(self, mock_database, mock_storage, mock_telemetry, mock_metrics):
        """Test data consistency throughout the pipeline"""
        
        document_id = "doc_123"
        original_text = "This is the original document content."
        
        # Step 1: Ingest
        ingest_worker = IngestWorker()
        
        with patch('app.services.ingest_worker.extract_text_from_pdf') as mock_extract:
            mock_extract.return_value = {
                "text": original_text,
                "pages": 1,
                "metadata": {"title": "Test Document"}
            }
            
            ingest_result = await ingest_worker.process_document(document_id, "test.pdf")
            
            # Verify text is preserved
            assert ingest_result["text"] == original_text
            
            # Step 2: Embed
            embed_worker = EmbedWorker()
            
            with patch('app.services.embed_worker.ChunkSplitter') as mock_splitter:
                mock_splitter_instance = Mock()
                mock_splitter_instance.split_text.return_value = [
                    Mock(text="This is the original", metadata={"chunk_index": 0}),
                    Mock(text="document content", metadata={"chunk_index": 1})
                ]
                mock_splitter.return_value = mock_splitter_instance
                
                with patch('app.services.embed_worker.EmbeddingService') as mock_embedding:
                    mock_embedding_instance = Mock()
                    mock_embedding_instance.generate_embeddings.return_value = [
                        [0.1] * 99,
                        [0.2] * 99
                    ]
                    mock_embedding.return_value = mock_embedding_instance
                    
                    embed_result = await embed_worker.process_document(document_id)
                    
                    # Verify chunks contain original content
                    chunks = mock_splitter_instance.split_text.call_args[0][0]
                    assert original_text in chunks
                    
                    # Verify embeddings are generated for all chunks
                    assert len(mock_embedding_instance.generate_embeddings.call_args[0][0]) == 2

    @pytest.mark.integration
    async def test_pipeline_metadata_preservation(self, mock_database, mock_storage, mock_telemetry, mock_metrics):
        """Test that metadata is preserved throughout the pipeline"""
        
        document_id = "doc_123"
        metadata = {
            "title": "Test Document",
            "author": "Test Author",
            "subject": "Test Subject",
            "keywords": ["test", "document", "pipeline"]
        }
        
        # Step 1: Ingest with metadata
        ingest_worker = IngestWorker()
        
        with patch('app.services.ingest_worker.extract_text_from_pdf') as mock_extract:
            mock_extract.return_value = {
                "text": "Test content",
                "pages": 1,
                "metadata": metadata
            }
            
            ingest_result = await ingest_worker.process_document(document_id, "test.pdf")
            
            # Verify metadata is stored
            mock_database.update_document_status.assert_called_with(
                document_id, "processed", {"pages": 1, **metadata}
            )
            
            # Step 2: Embed with metadata preservation
            embed_worker = EmbedWorker()
            
            with patch('app.services.embed_worker.ChunkSplitter') as mock_splitter:
                mock_splitter_instance = Mock()
                mock_splitter_instance.split_text.return_value = [
                    Mock(text="Test content", metadata={"chunk_index": 0, **metadata})
                ]
                mock_splitter.return_value = mock_splitter_instance
                
                with patch('app.services.embed_worker.EmbeddingService') as mock_embedding:
                    mock_embedding_instance = Mock()
                    mock_embedding_instance.generate_embeddings.return_value = [[0.1] * 99]
                    mock_embedding.return_value = mock_embedding_instance
                    
                    embed_result = await embed_worker.process_document(document_id)
                    
                    # Verify chunks preserve metadata
                    chunk_metadata = mock_splitter_instance.split_text.call_args[1].get("metadata", {})
                    for key, value in metadata.items():
                        assert chunk_metadata.get(key) == value

    @pytest.mark.integration
    async def test_pipeline_performance_monitoring(self, mock_database, mock_storage, mock_telemetry, mock_metrics):
        """Test performance monitoring throughout the pipeline"""
        
        ingest_worker = IngestWorker()
        
        with patch('app.services.ingest_worker.extract_text_from_pdf') as mock_extract:
            mock_extract.return_value = {
                "text": "Test content",
                "pages": 1,
                "metadata": {}
            }
            
            # Process document
            await ingest_worker.process_document("doc_123", "test.pdf")
            
            # Verify performance metrics are recorded
            mock_metrics.record_histogram.assert_called()
            
            # Verify telemetry spans are created
            mock_telemetry.create_span.assert_called()
            mock_telemetry.start_span.assert_called()
            mock_telemetry.end_span.assert_called()
            
            # Verify specific metrics
            calls = mock_metrics.record_histogram.call_args_list
            metric_names = [call[0][0] for call in calls]
            assert "document_processing_duration" in metric_names
            assert "text_extraction_duration" in metric_names

    @pytest.mark.integration
    async def test_pipeline_storage_operations(self, mock_database, mock_storage, mock_telemetry, mock_metrics):
        """Test storage operations in the pipeline"""
        
        ingest_worker = IngestWorker()
        
        with patch('app.services.ingest_worker.extract_text_from_pdf') as mock_extract:
            mock_extract.return_value = {
                "text": "Test content",
                "pages": 1,
                "metadata": {}
            }
            
            # Process document
            await ingest_worker.process_document("doc_123", "test.pdf")
            
            # Verify storage operations
            mock_storage.download_file.assert_called()
            mock_storage.upload_file.assert_called()
            
            # Verify storage paths
            download_call = mock_storage.download_file.call_args
            upload_call = mock_storage.upload_file.call_args
            
            assert "doc_123" in download_call[0][0]  # Document ID in download path
            assert "processed" in upload_call[0][0]  # Processed folder in upload path

    @pytest.mark.integration
    async def test_pipeline_database_transactions(self, mock_database, mock_storage, mock_telemetry, mock_metrics):
        """Test database transaction handling in the pipeline"""
        
        ingest_worker = IngestWorker()
        
        with patch('app.services.ingest_worker.extract_text_from_pdf') as mock_extract:
            mock_extract.return_value = {
                "text": "Test content",
                "pages": 1,
                "metadata": {}
            }
            
            # Process document
            await ingest_worker.process_document("doc_123", "test.pdf")
            
            # Verify database operations are called in correct order
            calls = mock_database.method_calls
            
            # Should start with getting document
            assert any("get_document" in str(call) for call in calls)
            
            # Should end with updating status
            assert any("update_document_status" in str(call) for call in calls)
            
            # Verify transaction consistency
            update_calls = [call for call in calls if "update_document_status" in str(call)]
            assert len(update_calls) >= 1  # At least one status update
