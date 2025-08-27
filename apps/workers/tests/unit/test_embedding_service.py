# Created automatically by Cursor AI (2024-12-19)

import pytest
import numpy as np
from unittest.mock import Mock, patch, MagicMock
from app.services.embedding_service import EmbeddingService


class TestEmbeddingService:
    """Unit tests for EmbeddingService"""

    def setup_method(self):
        """Set up test fixtures"""
        self.embedding_service = EmbeddingService()
        self.sample_texts = [
            "This is a sample text for embedding.",
            "Another text with different content.",
            "Similar content to the first text.",
            "Completely different topic and words."
        ]

    @patch('app.services.embedding_service.openai')
    def test_generate_embeddings_basic(self, mock_openai):
        """Test basic embedding generation"""
        # Mock OpenAI response
        mock_response = Mock()
        mock_response.data = [
            Mock(embedding=[0.1, 0.2, 0.3, 0.4, 0.5] * 20)  # 100-dim vector
        ]
        mock_openai.Embedding.create.return_value = mock_response
        
        embeddings = self.embedding_service.generate_embeddings(self.sample_texts[:2])
        
        assert len(embeddings) == 2
        assert all(len(emb) == 100 for emb in embeddings)
        assert all(isinstance(emb, list) for emb in embeddings)
        assert all(all(isinstance(val, float) for val in emb) for emb in embeddings)

    @patch('app.services.embedding_service.openai')
    def test_generate_embeddings_single_text(self, mock_openai):
        """Test embedding generation for single text"""
        mock_response = Mock()
        mock_response.data = [Mock(embedding=[0.1, 0.2, 0.3] * 33)]  # 99-dim vector
        mock_openai.Embedding.create.return_value = mock_response
        
        embedding = self.embedding_service.generate_embeddings([self.sample_texts[0]])
        
        assert len(embedding) == 1
        assert len(embedding[0]) == 99

    @patch('app.services.embedding_service.openai')
    def test_generate_embeddings_error_handling(self, mock_openai):
        """Test error handling in embedding generation"""
        mock_openai.Embedding.create.side_effect = Exception("API Error")
        
        with pytest.raises(Exception):
            self.embedding_service.generate_embeddings(self.sample_texts)

    def test_calculate_similarity(self):
        """Test cosine similarity calculation"""
        # Create test vectors
        vec1 = [1.0, 0.0, 0.0]
        vec2 = [0.0, 1.0, 0.0]
        vec3 = [1.0, 0.0, 0.0]  # Same as vec1
        
        # Orthogonal vectors should have similarity 0
        similarity_orthogonal = self.embedding_service.calculate_similarity(vec1, vec2)
        assert abs(similarity_orthogonal) < 0.001
        
        # Identical vectors should have similarity 1
        similarity_identical = self.embedding_service.calculate_similarity(vec1, vec3)
        assert abs(similarity_identical - 1.0) < 0.001

    def test_calculate_similarity_with_zeros(self):
        """Test similarity calculation with zero vectors"""
        vec1 = [0.0, 0.0, 0.0]
        vec2 = [1.0, 0.0, 0.0]
        
        # Zero vector with non-zero vector
        similarity = self.embedding_service.calculate_similarity(vec1, vec2)
        assert similarity == 0.0
        
        # Both zero vectors
        similarity_zero = self.embedding_service.calculate_similarity(vec1, vec1)
        assert similarity_zero == 0.0

    def test_calculate_similarity_different_lengths(self):
        """Test similarity calculation with vectors of different lengths"""
        vec1 = [1.0, 0.0, 0.0]
        vec2 = [1.0, 0.0, 0.0, 0.0]
        
        with pytest.raises(ValueError):
            self.embedding_service.calculate_similarity(vec1, vec2)

    def test_find_most_similar(self):
        """Test finding most similar embeddings"""
        # Create test embeddings
        query_embedding = [1.0, 0.0, 0.0]
        candidate_embeddings = [
            [0.9, 0.1, 0.0],  # High similarity
            [0.0, 1.0, 0.0],  # Low similarity
            [0.8, 0.2, 0.0],  # Medium similarity
        ]
        
        most_similar_idx = self.embedding_service.find_most_similar(
            query_embedding, candidate_embeddings
        )
        
        assert most_similar_idx == 0  # Should find the first one (highest similarity)

    def test_find_most_similar_empty_candidates(self):
        """Test finding most similar with empty candidate list"""
        query_embedding = [1.0, 0.0, 0.0]
        
        with pytest.raises(ValueError):
            self.embedding_service.find_most_similar(query_embedding, [])

    def test_find_top_k_similar(self):
        """Test finding top-k most similar embeddings"""
        query_embedding = [1.0, 0.0, 0.0]
        candidate_embeddings = [
            [0.9, 0.1, 0.0],  # Highest similarity
            [0.0, 1.0, 0.0],  # Lowest similarity
            [0.8, 0.2, 0.0],  # Medium similarity
            [0.7, 0.3, 0.0],  # Lower similarity
        ]
        
        top_k_indices = self.embedding_service.find_top_k_similar(
            query_embedding, candidate_embeddings, k=3
        )
        
        assert len(top_k_indices) == 3
        assert top_k_indices[0] == 0  # Highest similarity first
        assert top_k_indices[1] == 2  # Second highest
        assert top_k_indices[2] == 3  # Third highest

    def test_find_top_k_similar_k_larger_than_candidates(self):
        """Test finding top-k when k is larger than number of candidates"""
        query_embedding = [1.0, 0.0, 0.0]
        candidate_embeddings = [
            [0.9, 0.1, 0.0],
            [0.8, 0.2, 0.0],
        ]
        
        top_k_indices = self.embedding_service.find_top_k_similar(
            query_embedding, candidate_embeddings, k=5
        )
        
        assert len(top_k_indices) == 2
        assert top_k_indices[0] == 0
        assert top_k_indices[1] == 1

    def test_validate_embedding_quality(self):
        """Test embedding quality validation"""
        # Test good embedding (non-zero, reasonable magnitude)
        good_embedding = [0.1, -0.2, 0.3, 0.4, -0.5]
        is_valid = self.embedding_service.validate_embedding_quality(good_embedding)
        assert is_valid is True
        
        # Test zero embedding
        zero_embedding = [0.0] * 5
        is_valid = self.embedding_service.validate_embedding_quality(zero_embedding)
        assert is_valid is False
        
        # Test embedding with NaN values
        nan_embedding = [0.1, float('nan'), 0.3, 0.4, 0.5]
        is_valid = self.embedding_service.validate_embedding_quality(nan_embedding)
        assert is_valid is False
        
        # Test embedding with infinite values
        inf_embedding = [0.1, float('inf'), 0.3, 0.4, 0.5]
        is_valid = self.embedding_service.validate_embedding_quality(inf_embedding)
        assert is_valid is False

    def test_validate_embedding_quality_empty(self):
        """Test embedding quality validation with empty embedding"""
        with pytest.raises(ValueError):
            self.embedding_service.validate_embedding_quality([])

    def test_normalize_embedding(self):
        """Test embedding normalization"""
        # Test non-zero embedding
        embedding = [3.0, 4.0, 0.0]  # Magnitude = 5
        normalized = self.embedding_service.normalize_embedding(embedding)
        
        # Check magnitude is 1
        magnitude = sum(x*x for x in normalized) ** 0.5
        assert abs(magnitude - 1.0) < 0.001
        
        # Check direction is preserved
        assert normalized[0] == 0.6  # 3/5
        assert normalized[1] == 0.8  # 4/5
        assert normalized[2] == 0.0

    def test_normalize_embedding_zero(self):
        """Test normalization of zero embedding"""
        embedding = [0.0, 0.0, 0.0]
        normalized = self.embedding_service.normalize_embedding(embedding)
        
        # Should return zero vector
        assert all(x == 0.0 for x in normalized)

    def test_batch_embedding_generation(self):
        """Test batch processing of embeddings"""
        texts = ["Text 1", "Text 2", "Text 3", "Text 4", "Text 5"]
        
        with patch.object(self.embedding_service, 'generate_embeddings') as mock_gen:
            mock_gen.return_value = [[0.1] * 100] * len(texts)
            
            embeddings = self.embedding_service.generate_embeddings_batch(
                texts, batch_size=2
            )
            
            # Should be called multiple times for batches
            assert mock_gen.call_count >= 2
            assert len(embeddings) == len(texts)

    def test_embedding_cache_functionality(self):
        """Test embedding caching functionality"""
        text = "Test text for caching"
        
        # First call should generate embedding
        with patch.object(self.embedding_service, 'generate_embeddings') as mock_gen:
            mock_gen.return_value = [[0.1, 0.2, 0.3]]
            embedding1 = self.embedding_service.get_cached_embedding(text)
            
            # Second call should use cache
            embedding2 = self.embedding_service.get_cached_embedding(text)
            
            # Should only call generate_embeddings once
            assert mock_gen.call_count == 1
            assert embedding1 == embedding2

    def test_embedding_dimension_consistency(self):
        """Test that all embeddings have consistent dimensions"""
        texts = ["Short text", "Longer text with more words", "Medium length text"]
        
        with patch.object(self.embedding_service, 'generate_embeddings') as mock_gen:
            # Mock different dimension embeddings
            mock_gen.return_value = [
                [0.1] * 100,  # 100-dim
                [0.2] * 100,  # 100-dim
                [0.3] * 100,  # 100-dim
            ]
            
            embeddings = self.embedding_service.generate_embeddings(texts)
            
            # All embeddings should have same dimension
            dimensions = [len(emb) for emb in embeddings]
            assert len(set(dimensions)) == 1
            assert dimensions[0] == 100

    def test_embedding_semantic_consistency(self):
        """Test semantic consistency of embeddings"""
        similar_texts = [
            "The cat is on the mat.",
            "A cat sits on the mat.",
            "There is a cat on the mat."
        ]
        
        different_texts = [
            "The weather is sunny today.",
            "I love programming in Python.",
            "The recipe calls for flour and eggs."
        ]
        
        with patch.object(self.embedding_service, 'generate_embeddings') as mock_gen:
            # Mock embeddings that reflect semantic similarity
            mock_gen.side_effect = [
                [[0.9, 0.1, 0.0]],  # Similar text 1
                [[0.8, 0.2, 0.0]],  # Similar text 2
                [[0.85, 0.15, 0.0]],  # Similar text 3
                [[0.1, 0.9, 0.0]],  # Different text 1
                [[0.0, 0.1, 0.9]],  # Different text 2
                [[0.2, 0.8, 0.0]],  # Different text 3
            ]
            
            # Test similar texts have higher similarity
            similar_embeddings = []
            for text in similar_texts:
                emb = self.embedding_service.get_cached_embedding(text)
                similar_embeddings.append(emb)
            
            # Test different texts have lower similarity
            different_embeddings = []
            for text in different_texts:
                emb = self.embedding_service.get_cached_embedding(text)
                different_embeddings.append(emb)
            
            # Similar texts should have higher similarity among themselves
            similar_similarities = []
            for i in range(len(similar_embeddings)):
                for j in range(i+1, len(similar_embeddings)):
                    sim = self.embedding_service.calculate_similarity(
                        similar_embeddings[i], similar_embeddings[j]
                    )
                    similar_similarities.append(sim)
            
            # Different texts should have lower similarity
            different_similarities = []
            for i in range(len(different_embeddings)):
                for j in range(i+1, len(different_embeddings)):
                    sim = self.embedding_service.calculate_similarity(
                        different_embeddings[i], different_embeddings[j]
                    )
                    different_similarities.append(sim)
            
            # Average similarity of similar texts should be higher
            avg_similar = sum(similar_similarities) / len(similar_similarities)
            avg_different = sum(different_similarities) / len(different_similarities)
            
            assert avg_similar > avg_different
