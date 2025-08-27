# Created automatically by Cursor AI (2024-12-19)

import pytest
from unittest.mock import Mock, patch
from app.services.citation_formatter import CitationFormatter


class TestCitationFormatter:
    """Unit tests for CitationFormatter service"""

    def setup_method(self):
        """Set up test fixtures"""
        self.formatter = CitationFormatter()
        self.sample_chunks = [
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

    def test_extract_citations_basic(self):
        """Test basic citation extraction from text"""
        text = "According to the document [1], the results show significant improvement. Further analysis [2] confirms these findings."
        
        citations = self.formatter.extract_citations(text)
        
        assert len(citations) == 2
        assert citations[0]["reference"] == "[1]"
        assert citations[1]["reference"] == "[2]"

    def test_extract_citations_no_citations(self):
        """Test citation extraction when no citations are present"""
        text = "This is a plain text without any citations or references."
        
        citations = self.formatter.extract_citations(text)
        
        assert len(citations) == 0

    def test_extract_citations_various_formats(self):
        """Test citation extraction with various citation formats"""
        text = """
        Multiple citation formats: [1], (2), [3], (4), [5].
        Some with text: [see page 10], (reference 15).
        """
        
        citations = self.formatter.extract_citations(text)
        
        assert len(citations) >= 6  # Should find all citation patterns

    def test_format_citation_basic(self):
        """Test basic citation formatting"""
        chunk = self.sample_chunks[0]
        
        citation = self.formatter.format_citation(chunk, 1)
        
        assert citation["reference"] == "[1]"
        assert citation["source"] == "document1.pdf"
        assert citation["page"] == 1
        assert citation["text"] == chunk.text

    def test_format_citation_with_custom_reference(self):
        """Test citation formatting with custom reference number"""
        chunk = self.sample_chunks[1]
        
        citation = self.formatter.format_citation(chunk, 5)
        
        assert citation["reference"] == "[5]"
        assert citation["source"] == "document1.pdf"
        assert citation["page"] == 1

    def test_format_citation_with_metadata(self):
        """Test citation formatting with additional metadata"""
        chunk = Mock(
            text="Sample text with metadata.",
            metadata={
                "source": "research_paper.pdf",
                "page": 15,
                "section": "Methodology",
                "author": "John Doe",
                "year": 2023
            }
        )
        
        citation = self.formatter.format_citation(chunk, 1)
        
        assert citation["source"] == "research_paper.pdf"
        assert citation["page"] == 15
        assert citation["section"] == "Methodology"
        assert citation["author"] == "John Doe"
        assert citation["year"] == 2023

    def test_format_citations_list(self):
        """Test formatting a list of citations"""
        citations = self.formatter.format_citations_list(self.sample_chunks)
        
        assert len(citations) == 3
        assert citations[0]["reference"] == "[1]"
        assert citations[1]["reference"] == "[2]"
        assert citations[2]["reference"] == "[3]"
        assert citations[0]["source"] == "document1.pdf"
        assert citations[2]["source"] == "document2.pdf"

    def test_format_citations_list_empty(self):
        """Test formatting citations list with empty input"""
        citations = self.formatter.format_citations_list([])
        
        assert len(citations) == 0

    def test_insert_citations_into_text(self):
        """Test inserting citations into text"""
        text = "The results show improvement. Further analysis confirms these findings."
        citations = [
            {"reference": "[1]", "source": "doc1.pdf", "page": 1},
            {"reference": "[2]", "source": "doc2.pdf", "page": 5}
        ]
        
        formatted_text = self.formatter.insert_citations_into_text(text, citations)
        
        assert "[1]" in formatted_text
        assert "[2]" in formatted_text
        assert "doc1.pdf" in formatted_text
        assert "doc2.pdf" in formatted_text

    def test_insert_citations_into_text_no_citations(self):
        """Test inserting citations when no citations are provided"""
        text = "This is a sample text."
        
        formatted_text = self.formatter.insert_citations_into_text(text, [])
        
        assert formatted_text == text

    def test_validate_citation_format(self):
        """Test citation format validation"""
        # Valid citation
        valid_citation = {
            "reference": "[1]",
            "source": "document.pdf",
            "page": 1,
            "text": "Sample text"
        }
        assert self.formatter.validate_citation_format(valid_citation) is True
        
        # Invalid citation - missing required fields
        invalid_citation = {
            "reference": "[1]",
            "source": "document.pdf"
            # Missing page and text
        }
        assert self.formatter.validate_citation_format(invalid_citation) is False
        
        # Invalid citation - empty text
        invalid_citation2 = {
            "reference": "[1]",
            "source": "document.pdf",
            "page": 1,
            "text": ""
        }
        assert self.formatter.validate_citation_format(invalid_citation2) is False

    def test_deduplicate_citations(self):
        """Test citation deduplication"""
        citations = [
            {"reference": "[1]", "source": "doc1.pdf", "page": 1, "text": "Text 1"},
            {"reference": "[2]", "source": "doc1.pdf", "page": 1, "text": "Text 1"},  # Duplicate
            {"reference": "[3]", "source": "doc2.pdf", "page": 2, "text": "Text 2"},
            {"reference": "[4]", "source": "doc1.pdf", "page": 1, "text": "Text 1"},  # Duplicate
        ]
        
        deduplicated = self.formatter.deduplicate_citations(citations)
        
        assert len(deduplicated) == 2
        assert deduplicated[0]["reference"] == "[1]"
        assert deduplicated[1]["reference"] == "[3]"

    def test_sort_citations_by_source(self):
        """Test sorting citations by source"""
        citations = [
            {"reference": "[3]", "source": "doc2.pdf", "page": 2},
            {"reference": "[1]", "source": "doc1.pdf", "page": 1},
            {"reference": "[2]", "source": "doc1.pdf", "page": 3},
        ]
        
        sorted_citations = self.formatter.sort_citations_by_source(citations)
        
        assert sorted_citations[0]["source"] == "doc1.pdf"
        assert sorted_citations[1]["source"] == "doc1.pdf"
        assert sorted_citations[2]["source"] == "doc2.pdf"

    def test_generate_citation_summary(self):
        """Test generating citation summary"""
        citations = [
            {"reference": "[1]", "source": "doc1.pdf", "page": 1},
            {"reference": "[2]", "source": "doc1.pdf", "page": 2},
            {"reference": "[3]", "source": "doc2.pdf", "page": 1},
        ]
        
        summary = self.formatter.generate_citation_summary(citations)
        
        assert "doc1.pdf" in summary
        assert "doc2.pdf" in summary
        assert "2 citations" in summary or "2 references" in summary

    def test_format_citation_for_export(self):
        """Test formatting citations for export formats"""
        citation = {
            "reference": "[1]",
            "source": "research_paper.pdf",
            "page": 15,
            "author": "John Doe",
            "year": 2023,
            "text": "Sample text"
        }
        
        # Test APA format
        apa_format = self.formatter.format_citation_for_export(citation, "apa")
        assert "Doe" in apa_format
        assert "2023" in apa_format
        
        # Test MLA format
        mla_format = self.formatter.format_citation_for_export(citation, "mla")
        assert "Doe" in mla_format
        
        # Test Chicago format
        chicago_format = self.formatter.format_citation_for_export(citation, "chicago")
        assert "Doe" in chicago_format

    def test_extract_citations_from_markdown(self):
        """Test extracting citations from markdown text"""
        markdown_text = """
        This is a markdown text with citations.
        
        According to the research [1], the findings are significant.
        
        > Quote from the document [2]
        
        **Bold text** with reference [3].
        """
        
        citations = self.formatter.extract_citations_from_markdown(markdown_text)
        
        assert len(citations) == 3
        assert all(citation["reference"] in ["[1]", "[2]", "[3]"] for citation in citations)

    def test_clean_citation_text(self):
        """Test cleaning citation text"""
        dirty_text = "  This is a citation text with   extra   spaces  and\nnewlines.  "
        
        cleaned_text = self.formatter.clean_citation_text(dirty_text)
        
        assert cleaned_text == "This is a citation text with extra spaces and newlines."
        assert "\n" not in cleaned_text
        assert "  " not in cleaned_text

    def test_validate_citation_consistency(self):
        """Test citation consistency validation"""
        citations = [
            {"reference": "[1]", "source": "doc1.pdf", "page": 1},
            {"reference": "[2]", "source": "doc1.pdf", "page": 2},
            {"reference": "[4]", "source": "doc2.pdf", "page": 1},  # Missing [3]
        ]
        
        is_consistent = self.formatter.validate_citation_consistency(citations)
        
        assert is_consistent is False  # Missing [3]

    def test_validate_citation_consistency_valid(self):
        """Test citation consistency validation with valid sequence"""
        citations = [
            {"reference": "[1]", "source": "doc1.pdf", "page": 1},
            {"reference": "[2]", "source": "doc1.pdf", "page": 2},
            {"reference": "[3]", "source": "doc2.pdf", "page": 1},
        ]
        
        is_consistent = self.formatter.validate_citation_consistency(citations)
        
        assert is_consistent is True

    def test_format_citation_with_confidence(self):
        """Test citation formatting with confidence scores"""
        chunk = Mock(
            text="Sample text with high confidence.",
            metadata={
                "source": "document.pdf",
                "page": 1,
                "confidence": 0.95
            }
        )
        
        citation = self.formatter.format_citation(chunk, 1)
        
        assert citation["confidence"] == 0.95
        assert citation["reference"] == "[1]"

    def test_format_citation_without_confidence(self):
        """Test citation formatting without confidence score"""
        chunk = Mock(
            text="Sample text without confidence.",
            metadata={
                "source": "document.pdf",
                "page": 1
            }
        )
        
        citation = self.formatter.format_citation(chunk, 1)
        
        assert "confidence" not in citation or citation["confidence"] is None

    def test_extract_citations_with_context(self):
        """Test extracting citations with surrounding context"""
        text = "The study [1] shows that the results are significant. Further analysis [2] confirms this."
        
        citations_with_context = self.formatter.extract_citations_with_context(text, context_chars=20)
        
        assert len(citations_with_context) == 2
        assert "study" in citations_with_context[0]["context"]
        assert "analysis" in citations_with_context[1]["context"]

    def test_format_citation_with_timestamp(self):
        """Test citation formatting with timestamp"""
        chunk = Mock(
            text="Sample text with timestamp.",
            metadata={
                "source": "document.pdf",
                "page": 1,
                "timestamp": "2023-12-19T10:30:00Z"
            }
        )
        
        citation = self.formatter.format_citation(chunk, 1)
        
        assert citation["timestamp"] == "2023-12-19T10:30:00Z"
        assert citation["reference"] == "[1]"

    def test_merge_citations_from_same_source(self):
        """Test merging citations from the same source"""
        citations = [
            {"reference": "[1]", "source": "doc1.pdf", "page": 1, "text": "Text 1"},
            {"reference": "[2]", "source": "doc1.pdf", "page": 2, "text": "Text 2"},
            {"reference": "[3]", "source": "doc2.pdf", "page": 1, "text": "Text 3"},
        ]
        
        merged = self.formatter.merge_citations_from_same_source(citations)
        
        assert len(merged) == 2  # Should merge doc1.pdf citations
        assert merged[0]["source"] == "doc1.pdf"
        assert merged[0]["pages"] == [1, 2]  # Should have multiple pages
        assert merged[1]["source"] == "doc2.pdf"
        assert merged[1]["pages"] == [1]  # Single page
