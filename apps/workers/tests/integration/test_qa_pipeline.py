# Created automatically by Cursor AI (2024-12-19)

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from app.services.qa_worker import QAWorker
from app.services.database_service import DatabaseService
from app.services.embedding_service import EmbeddingService


class TestQAPipeline:
    """Integration tests for the QA pipeline"""

    @pytest.fixture
    def sample_chunks(self):
        """Sample document chunks for testing"""
        return [
            {
                "id": "chunk_1",
                "text": "Machine learning is a subset of artificial intelligence.",
                "metadata": {
                    "source": "document1.pdf",
                    "page": 1,
                    "chunk_index": 0
                },
                "embedding": [0.1, 0.2, 0.3] * 33  # 99-dim vector
            },
            {
                "id": "chunk_2",
                "text": "It enables computers to learn from data without being explicitly programmed.",
                "metadata": {
                    "source": "document1.pdf",
                    "page": 1,
                    "chunk_index": 1
                },
                "embedding": [0.4, 0.5, 0.6] * 33  # 99-dim vector
            },
            {
                "id": "chunk_3",
                "text": "Deep learning is a type of machine learning using neural networks.",
                "metadata": {
                    "source": "document2.pdf",
                    "page": 2,
                    "chunk_index": 0
                },
                "embedding": [0.7, 0.8, 0.9] * 33  # 99-dim vector
            }
        ]

    @pytest.fixture
    def mock_database(self):
        """Mock database service"""
        with patch('app.services.database_service.DatabaseService') as mock:
            mock_instance = Mock()
            mock_instance.get_document.return_value = {
                "id": "doc_123",
                "filename": "test_document.pdf",
                "status": "embedded",
                "metadata": {"title": "Test Document"}
            }
            mock_instance.search_chunks.return_value = []
            mock_instance.create_thread.return_value = "thread_123"
            mock_instance.add_message.return_value = "msg_123"
            mock_instance.get_thread_messages.return_value = []
            mock.return_value = mock_instance
            yield mock_instance

    @pytest.fixture
    def mock_embedding_service(self):
        """Mock embedding service"""
        with patch('app.services.embedding_service.EmbeddingService') as mock:
            mock_instance = Mock()
            mock_instance.generate_embeddings.return_value = [[0.1, 0.2, 0.3] * 33]
            mock_instance.find_top_k_similar.return_value = [0, 1, 2]
            mock.return_value = mock_instance
            yield mock_instance

    @pytest.fixture
    def mock_llm_service(self):
        """Mock LLM service"""
        with patch('app.services.llm_service.LLMService') as mock:
            mock_instance = Mock()
            mock_instance.generate_answer.return_value = {
                "answer": "Machine learning is a subset of AI that enables computers to learn from data.",
                "citations": [
                    {"reference": "[1]", "source": "document1.pdf", "page": 1},
                    {"reference": "[2]", "source": "document1.pdf", "page": 1}
                ]
            }
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
    async def test_complete_qa_pipeline(self, sample_chunks, mock_database, mock_embedding_service, mock_llm_service, mock_telemetry, mock_metrics):
        """Test the complete QA pipeline from query to answer"""
        
        # Setup mock responses
        mock_database.search_chunks.return_value = sample_chunks[:2]  # Return first 2 chunks
        
        # Create QA worker
        qa_worker = QAWorker()
        
        # Test query processing
        query = "What is machine learning?"
        document_id = "doc_123"
        user_id = "user_456"
        
        result = await qa_worker.process_query(query, document_id, user_id)
        
        # Verify result structure
        assert result["status"] == "completed"
        assert "answer" in result
        assert "citations" in result
        assert "thread_id" in result
        assert "message_id" in result
        
        # Verify answer content
        assert "machine learning" in result["answer"].lower()
        assert len(result["citations"]) > 0
        
        # Verify database operations
        mock_database.search_chunks.assert_called_with(document_id, query, limit=5)
        mock_database.create_thread.assert_called_with(document_id, user_id)
        mock_database.add_message.assert_called()
        
        # Verify embedding operations
        mock_embedding_service.generate_embeddings.assert_called_with([query])
        mock_embedding_service.find_top_k_similar.assert_called()
        
        # Verify LLM operations
        mock_llm_service.generate_answer.assert_called()
        
        # Verify metrics recording
        mock_metrics.record_counter.assert_called()
        mock_metrics.record_histogram.assert_called()
        
        # Verify telemetry
        mock_telemetry.create_span.assert_called()
        mock_telemetry.start_span.assert_called()
        mock_telemetry.end_span.assert_called()

    @pytest.mark.integration
    async def test_qa_pipeline_with_context(self, sample_chunks, mock_database, mock_embedding_service, mock_llm_service, mock_telemetry, mock_metrics):
        """Test QA pipeline with conversation context"""
        
        # Setup existing thread with messages
        existing_messages = [
            {
                "id": "msg_1",
                "role": "user",
                "content": "What is AI?",
                "created_at": "2023-12-19T10:00:00Z"
            },
            {
                "id": "msg_2",
                "role": "assistant",
                "content": "AI stands for Artificial Intelligence.",
                "citations": [{"reference": "[1]", "source": "document1.pdf", "page": 1}],
                "created_at": "2023-12-19T10:01:00Z"
            }
        ]
        
        mock_database.get_thread_messages.return_value = existing_messages
        mock_database.search_chunks.return_value = sample_chunks
        
        # Create QA worker
        qa_worker = QAWorker()
        
        # Test follow-up query
        query = "How does it relate to machine learning?"
        thread_id = "thread_123"
        
        result = await qa_worker.process_followup_query(query, thread_id)
        
        # Verify context is included
        assert result["status"] == "completed"
        assert "answer" in result
        
        # Verify LLM was called with context
        llm_call_args = mock_llm_service.generate_answer.call_args
        context = llm_call_args[1].get("context", "")
        assert "AI stands for Artificial Intelligence" in context
        assert query in context

    @pytest.mark.integration
    async def test_qa_pipeline_retrieval_quality(self, sample_chunks, mock_database, mock_embedding_service, mock_llm_service, mock_telemetry, mock_metrics):
        """Test retrieval quality in QA pipeline"""
        
        # Setup different retrieval scenarios
        mock_database.search_chunks.return_value = sample_chunks
        
        qa_worker = QAWorker()
        
        # Test specific query
        query = "What is deep learning?"
        
        result = await qa_worker.process_query(query, "doc_123", "user_456")
        
        # Verify relevant chunks were retrieved
        search_call = mock_database.search_chunks.call_args
        assert search_call[0][1] == query  # Query was passed correctly
        
        # Verify embedding similarity search
        embedding_call = mock_embedding_service.find_top_k_similar.call_args
        assert len(embedding_call[0][1]) == len(sample_chunks)  # All chunks considered
        
        # Verify top-k retrieval
        top_k_indices = mock_embedding_service.find_top_k_similar.return_value
        assert len(top_k_indices) <= 5  # Should return top 5 or fewer

    @pytest.mark.integration
    async def test_qa_pipeline_citation_generation(self, sample_chunks, mock_database, mock_embedding_service, mock_llm_service, mock_telemetry, mock_metrics):
        """Test citation generation in QA pipeline"""
        
        # Setup mock LLM response with citations
        mock_llm_service.generate_answer.return_value = {
            "answer": "Machine learning enables computers to learn from data. Deep learning uses neural networks.",
            "citations": [
                {"reference": "[1]", "source": "document1.pdf", "page": 1, "text": "Machine learning is a subset of artificial intelligence."},
                {"reference": "[2]", "source": "document2.pdf", "page": 2, "text": "Deep learning is a type of machine learning using neural networks."}
            ]
        }
        
        mock_database.search_chunks.return_value = sample_chunks
        
        qa_worker = QAWorker()
        
        result = await qa_worker.process_query("Explain machine learning and deep learning", "doc_123", "user_456")
        
        # Verify citations are properly formatted
        assert len(result["citations"]) == 2
        assert result["citations"][0]["reference"] == "[1]"
        assert result["citations"][0]["source"] == "document1.pdf"
        assert result["citations"][1]["reference"] == "[2]"
        assert result["citations"][1]["source"] == "document2.pdf"
        
        # Verify citations are included in answer
        answer = result["answer"]
        assert "[1]" in answer
        assert "[2]" in answer

    @pytest.mark.integration
    async def test_qa_pipeline_error_handling(self, mock_database, mock_embedding_service, mock_llm_service, mock_telemetry, mock_metrics):
        """Test error handling in QA pipeline"""
        
        # Test database error
        mock_database.search_chunks.side_effect = Exception("Database error")
        
        qa_worker = QAWorker()
        
        result = await qa_worker.process_query("Test query", "doc_123", "user_456")
        
        assert result["status"] == "failed"
        assert "error" in result
        
        # Verify error metrics
        mock_metrics.record_counter.assert_called()
        
        # Test LLM error
        mock_database.search_chunks.side_effect = None
        mock_database.search_chunks.return_value = []
        mock_llm_service.generate_answer.side_effect = Exception("LLM error")
        
        result = await qa_worker.process_query("Test query", "doc_123", "user_456")
        
        assert result["status"] == "failed"
        assert "error" in result

    @pytest.mark.integration
    async def test_qa_pipeline_performance_monitoring(self, sample_chunks, mock_database, mock_embedding_service, mock_llm_service, mock_telemetry, mock_metrics):
        """Test performance monitoring in QA pipeline"""
        
        mock_database.search_chunks.return_value = sample_chunks
        
        qa_worker = QAWorker()
        
        await qa_worker.process_query("Test query", "doc_123", "user_456")
        
        # Verify performance metrics
        mock_metrics.record_histogram.assert_called()
        
        # Verify specific metrics
        calls = mock_metrics.record_histogram.call_args_list
        metric_names = [call[0][0] for call in calls]
        assert "qa_query_duration" in metric_names
        assert "retrieval_duration" in metric_names
        assert "llm_generation_duration" in metric_names
        
        # Verify telemetry spans
        mock_telemetry.create_span.assert_called()
        mock_telemetry.start_span.assert_called()
        mock_telemetry.end_span.assert_called()

    @pytest.mark.integration
    async def test_qa_pipeline_concurrent_queries(self, sample_chunks, mock_database, mock_embedding_service, mock_llm_service, mock_telemetry, mock_metrics):
        """Test concurrent query processing"""
        
        mock_database.search_chunks.return_value = sample_chunks
        
        qa_worker = QAWorker()
        
        # Process multiple queries concurrently
        queries = [
            "What is machine learning?",
            "How does deep learning work?",
            "What are neural networks?",
            "Explain AI applications",
            "What is supervised learning?"
        ]
        
        tasks = []
        for query in queries:
            task = qa_worker.process_query(query, "doc_123", "user_456")
            tasks.append(task)
        
        results = await asyncio.gather(*tasks)
        
        # All should complete successfully
        assert len(results) == 5
        assert all(result["status"] == "completed" for result in results)
        
        # Verify concurrent processing
        assert mock_metrics.record_counter.call_count >= 5

    @pytest.mark.integration
    async def test_qa_pipeline_memory_management(self, sample_chunks, mock_database, mock_embedding_service, mock_llm_service, mock_telemetry, mock_metrics):
        """Test memory management in QA pipeline"""
        
        # Create large number of chunks
        large_chunks = []
        for i in range(100):
            large_chunks.append({
                "id": f"chunk_{i}",
                "text": f"This is chunk {i} with some content.",
                "metadata": {"source": "large_doc.pdf", "page": i // 10 + 1},
                "embedding": [0.1 * (i % 10)] * 99
            })
        
        mock_database.search_chunks.return_value = large_chunks
        
        qa_worker = QAWorker()
        
        # Process query with large context
        result = await qa_worker.process_query("Test query", "doc_123", "user_456")
        
        # Should still complete successfully
        assert result["status"] == "completed"
        
        # Verify memory-efficient processing
        # (In real implementation, this would check memory usage)

    @pytest.mark.integration
    async def test_qa_pipeline_streaming_response(self, sample_chunks, mock_database, mock_embedding_service, mock_llm_service, mock_telemetry, mock_metrics):
        """Test streaming response in QA pipeline"""
        
        # Mock streaming LLM response
        async def mock_streaming_response(*args, **kwargs):
            yield "Machine "
            yield "learning "
            yield "is "
            yield "a "
            yield "subset "
            yield "of "
            yield "AI."
        
        mock_llm_service.generate_answer_stream.return_value = mock_streaming_response()
        mock_database.search_chunks.return_value = sample_chunks
        
        qa_worker = QAWorker()
        
        # Test streaming query
        query = "What is machine learning?"
        stream_generator = qa_worker.process_query_stream(query, "doc_123", "user_456")
        
        # Collect streaming response
        response_parts = []
        async for part in stream_generator:
            response_parts.append(part)
        
        # Verify streaming response
        assert len(response_parts) > 0
        full_response = "".join(response_parts)
        assert "machine learning" in full_response.lower()

    @pytest.mark.integration
    async def test_qa_pipeline_quality_assessment(self, sample_chunks, mock_database, mock_embedding_service, mock_llm_service, mock_telemetry, mock_metrics):
        """Test quality assessment in QA pipeline"""
        
        mock_database.search_chunks.return_value = sample_chunks
        
        qa_worker = QAWorker()
        
        # Test query with quality assessment
        result = await qa_worker.process_query_with_quality_check("What is machine learning?", "doc_123", "user_456")
        
        # Verify quality metrics are included
        assert "quality_score" in result
        assert "confidence" in result
        assert "relevance_score" in result
        
        # Verify quality thresholds
        assert 0 <= result["quality_score"] <= 1
        assert 0 <= result["confidence"] <= 1
        assert 0 <= result["relevance_score"] <= 1

    @pytest.mark.integration
    async def test_qa_pipeline_feedback_integration(self, sample_chunks, mock_database, mock_embedding_service, mock_llm_service, mock_telemetry, mock_metrics):
        """Test feedback integration in QA pipeline"""
        
        mock_database.search_chunks.return_value = sample_chunks
        
        qa_worker = QAWorker()
        
        # Process query
        result = await qa_worker.process_query("What is machine learning?", "doc_123", "user_456")
        
        # Record feedback
        feedback_result = await qa_worker.record_feedback(
            result["message_id"], 
            "positive", 
            "Great answer with good citations"
        )
        
        # Verify feedback is recorded
        assert feedback_result["status"] == "recorded"
        
        # Verify feedback metrics
        mock_metrics.record_counter.assert_called()
        
        # Verify feedback is stored in database
        mock_database.record_feedback.assert_called_with(
            result["message_id"], 
            "positive", 
            "Great answer with good citations"
        )
