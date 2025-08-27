# Created automatically by Cursor AI (2024-12-19)

import pytest
from unittest.mock import Mock, patch
from app.services.chunk_splitter import ChunkSplitter


class TestChunkSplitter:
    """Unit tests for ChunkSplitter service"""

    def setup_method(self):
        """Set up test fixtures"""
        self.splitter = ChunkSplitter()
        self.sample_text = """
        This is a sample document with multiple paragraphs.
        
        It contains various types of content including:
        - Bullet points
        - Numbered lists
        - Tables and structured data
        
        The document should be split into appropriate chunks
        while preserving context and meaning.
        """

    def test_split_text_basic(self):
        """Test basic text splitting functionality"""
        chunks = self.splitter.split_text(self.sample_text, max_chunk_size=100)
        
        assert len(chunks) > 1
        assert all(len(chunk.text) <= 100 for chunk in chunks)
        assert all(chunk.text.strip() for chunk in chunks)

    def test_split_text_with_overlap(self):
        """Test text splitting with overlap preservation"""
        chunks = self.splitter.split_text(
            self.sample_text, 
            max_chunk_size=100, 
            overlap_size=20
        )
        
        # Check that consecutive chunks have overlap
        for i in range(len(chunks) - 1):
            current_chunk = chunks[i].text
            next_chunk = chunks[i + 1].text
            
            # Find common text at the end of current and start of next
            overlap_found = False
            for overlap_len in range(10, min(len(current_chunk), len(next_chunk))):
                if current_chunk[-overlap_len:] == next_chunk[:overlap_len]:
                    overlap_found = True
                    break
            
            assert overlap_found, f"No overlap found between chunks {i} and {i+1}"

    def test_split_text_preserves_metadata(self):
        """Test that metadata is preserved in chunks"""
        metadata = {
            "source": "test_document.pdf",
            "page": 1,
            "section": "introduction"
        }
        
        chunks = self.splitter.split_text(
            self.sample_text, 
            max_chunk_size=100,
            metadata=metadata
        )
        
        for chunk in chunks:
            assert chunk.metadata["source"] == "test_document.pdf"
            assert chunk.metadata["page"] == 1
            assert chunk.metadata["section"] == "introduction"
            assert "chunk_index" in chunk.metadata
            assert "total_chunks" in chunk.metadata

    def test_split_text_respects_sentences(self):
        """Test that text splitting respects sentence boundaries"""
        text = "This is sentence one. This is sentence two. This is sentence three."
        
        chunks = self.splitter.split_text(text, max_chunk_size=50)
        
        # Verify no sentence is split in the middle
        for chunk in chunks:
            chunk_text = chunk.text.strip()
            if not chunk_text.endswith('.'):
                # If chunk doesn't end with period, it should be the last chunk
                assert chunk == chunks[-1]

    def test_split_text_handles_empty_text(self):
        """Test handling of empty text input"""
        chunks = self.splitter.split_text("", max_chunk_size=100)
        assert len(chunks) == 0

    def test_split_text_handles_short_text(self):
        """Test handling of text shorter than max_chunk_size"""
        short_text = "This is a short text."
        chunks = self.splitter.split_text(short_text, max_chunk_size=100)
        
        assert len(chunks) == 1
        assert chunks[0].text.strip() == short_text

    def test_split_text_with_special_characters(self):
        """Test text splitting with special characters and formatting"""
        text_with_special = """
        Document with special chars: @#$%^&*()
        
        Line breaks\nand tabs\tand spaces    .
        
        Unicode: émojis 🚀 and symbols ©®™
        """
        
        chunks = self.splitter.split_text(text_with_special, max_chunk_size=80)
        
        assert len(chunks) > 1
        # Verify special characters are preserved
        combined_text = "".join(chunk.text for chunk in chunks)
        assert "@#$%^&*()" in combined_text
        assert "émojis 🚀" in combined_text

    def test_split_text_chunk_ordering(self):
        """Test that chunks maintain correct ordering"""
        text = "Chunk one. Chunk two. Chunk three. Chunk four."
        
        chunks = self.splitter.split_text(text, max_chunk_size=20)
        
        # Verify chunk indices are sequential
        for i, chunk in enumerate(chunks):
            assert chunk.metadata["chunk_index"] == i
            assert chunk.metadata["total_chunks"] == len(chunks)

    def test_split_text_with_tables(self):
        """Test text splitting with table-like content"""
        table_text = """
        | Column 1 | Column 2 | Column 3 |
        |----------|----------|----------|
        | Data 1   | Data 2   | Data 3   |
        | Data 4   | Data 5   | Data 6   |
        """
        
        chunks = self.splitter.split_text(table_text, max_chunk_size=100)
        
        # Verify table structure is preserved as much as possible
        for chunk in chunks:
            if "|" in chunk.text:
                # Table rows should be kept together when possible
                lines = chunk.text.strip().split('\n')
                for line in lines:
                    if line.strip() and '|' in line:
                        # Verify table row format
                        assert line.count('|') >= 2

    def test_split_text_error_handling(self):
        """Test error handling for invalid inputs"""
        with pytest.raises(ValueError):
            self.splitter.split_text(self.sample_text, max_chunk_size=0)
        
        with pytest.raises(ValueError):
            self.splitter.split_text(self.sample_text, max_chunk_size=-10)
        
        with pytest.raises(ValueError):
            self.splitter.split_text(self.sample_text, overlap_size=-5)

    def test_split_text_performance(self):
        """Test performance with large text"""
        large_text = "This is a sentence. " * 1000  # ~20KB of text
        
        chunks = self.splitter.split_text(large_text, max_chunk_size=500)
        
        assert len(chunks) > 1
        assert all(len(chunk.text) <= 500 for chunk in chunks)
        
        # Verify all original content is preserved
        original_words = set(large_text.split())
        chunk_words = set()
        for chunk in chunks:
            chunk_words.update(chunk.text.split())
        
        # Allow for some differences due to splitting
        assert len(original_words - chunk_words) < len(original_words) * 0.1
