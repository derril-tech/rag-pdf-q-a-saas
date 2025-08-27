# Created automatically by Cursor AI (2024-12-19)

import pytest
from unittest.mock import Mock, patch, MagicMock
from app.services.guardrails import GuardrailsService


class TestGuardrailsService:
    """Unit tests for GuardrailsService"""

    def setup_method(self):
        """Set up test fixtures"""
        self.guardrails = GuardrailsService()
        self.sample_text = "This is a sample text for testing guardrails."
        self.sample_query = "What is the capital of France?"
        self.sample_response = "The capital of France is Paris."

    def test_content_filtering_basic(self):
        """Test basic content filtering"""
        # Test clean content
        is_clean = self.guardrails.filter_content(self.sample_text)
        assert is_clean is True
        
        # Test content with inappropriate words
        inappropriate_text = "This text contains bad words and inappropriate content."
        is_clean = self.guardrails.filter_content(inappropriate_text)
        assert is_clean is False

    def test_content_filtering_empty(self):
        """Test content filtering with empty text"""
        is_clean = self.guardrails.filter_content("")
        assert is_clean is True  # Empty content should be considered clean

    def test_content_filtering_whitespace(self):
        """Test content filtering with whitespace-only text"""
        is_clean = self.guardrails.filter_content("   \n\t   ")
        assert is_clean is True

    def test_safety_check_query(self):
        """Test safety checking for queries"""
        # Test safe query
        is_safe = self.guardrails.check_query_safety(self.sample_query)
        assert is_safe is True
        
        # Test potentially harmful query
        harmful_query = "How to hack into a system?"
        is_safe = self.guardrails.check_query_safety(harmful_query)
        assert is_safe is False

    def test_safety_check_response(self):
        """Test safety checking for responses"""
        # Test safe response
        is_safe = self.guardrails.check_response_safety(self.sample_response)
        assert is_safe is True
        
        # Test potentially harmful response
        harmful_response = "Here's how to bypass security measures..."
        is_safe = self.guardrails.check_response_safety(harmful_response)
        assert is_safe is False

    def test_pii_detection(self):
        """Test PII detection in text"""
        # Test text without PII
        pii_found = self.guardrails.detect_pii(self.sample_text)
        assert len(pii_found) == 0
        
        # Test text with email
        text_with_email = "Contact me at john.doe@example.com for more information."
        pii_found = self.guardrails.detect_pii(text_with_email)
        assert len(pii_found) > 0
        assert "email" in [item["type"] for item in pii_found]
        
        # Test text with phone number
        text_with_phone = "Call me at 555-123-4567 for details."
        pii_found = self.guardrails.detect_pii(text_with_phone)
        assert len(pii_found) > 0
        assert "phone" in [item["type"] for item in pii_found]

    def test_pii_masking(self):
        """Test PII masking functionality"""
        text_with_pii = "Contact John Doe at john.doe@example.com or call 555-123-4567."
        
        masked_text = self.guardrails.mask_pii(text_with_pii)
        
        assert "john.doe@example.com" not in masked_text
        assert "555-123-4567" not in masked_text
        assert "John Doe" not in masked_text
        assert "[EMAIL]" in masked_text
        assert "[PHONE]" in masked_text
        assert "[NAME]" in masked_text

    def test_rate_limiting(self):
        """Test rate limiting functionality"""
        user_id = "test_user_123"
        
        # First request should be allowed
        is_allowed = self.guardrails.check_rate_limit(user_id, "query")
        assert is_allowed is True
        
        # Multiple rapid requests should be rate limited
        for _ in range(10):
            self.guardrails.check_rate_limit(user_id, "query")
        
        # Should be rate limited after exceeding limit
        is_allowed = self.guardrails.check_rate_limit(user_id, "query")
        assert is_allowed is False

    def test_rate_limiting_different_users(self):
        """Test rate limiting for different users"""
        user1 = "user1"
        user2 = "user2"
        
        # Both users should be allowed initially
        assert self.guardrails.check_rate_limit(user1, "query") is True
        assert self.guardrails.check_rate_limit(user2, "query") is True
        
        # Rate limit one user
        for _ in range(10):
            self.guardrails.check_rate_limit(user1, "query")
        
        # User1 should be limited, User2 should still be allowed
        assert self.guardrails.check_rate_limit(user1, "query") is False
        assert self.guardrails.check_rate_limit(user2, "query") is True

    def test_content_length_validation(self):
        """Test content length validation"""
        # Test reasonable length
        reasonable_text = "This is a reasonable length text."
        is_valid = self.guardrails.validate_content_length(reasonable_text)
        assert is_valid is True
        
        # Test extremely long text
        long_text = "This is a very long text. " * 1000
        is_valid = self.guardrails.validate_content_length(long_text)
        assert is_valid is False
        
        # Test empty text
        is_valid = self.guardrails.validate_content_length("")
        assert is_valid is True

    def test_language_detection(self):
        """Test language detection and filtering"""
        # Test English text
        english_text = "This is English text."
        is_allowed = self.guardrails.check_language_allowed(english_text)
        assert is_allowed is True
        
        # Test non-English text (assuming only English is allowed)
        non_english_text = "Ceci est du texte français."
        is_allowed = self.guardrails.check_language_allowed(non_english_text)
        assert is_allowed is False

    def test_topic_classification(self):
        """Test topic classification and filtering"""
        # Test appropriate topic
        appropriate_text = "What is the weather like today?"
        is_appropriate = self.guardrails.classify_topic(appropriate_text)
        assert is_appropriate is True
        
        # Test inappropriate topic
        inappropriate_text = "How to make illegal substances?"
        is_appropriate = self.guardrails.classify_topic(inappropriate_text)
        assert is_appropriate is False

    def test_sentiment_analysis(self):
        """Test sentiment analysis for content moderation"""
        # Test neutral sentiment
        neutral_text = "The sky is blue."
        sentiment = self.guardrails.analyze_sentiment(neutral_text)
        assert sentiment["score"] > -0.5
        assert sentiment["score"] < 0.5
        
        # Test positive sentiment
        positive_text = "I love this amazing product!"
        sentiment = self.guardrails.analyze_sentiment(positive_text)
        assert sentiment["score"] > 0.5
        
        # Test negative sentiment
        negative_text = "I hate this terrible product!"
        sentiment = self.guardrails.analyze_sentiment(negative_text)
        assert sentiment["score"] < -0.5

    def test_toxicity_detection(self):
        """Test toxicity detection"""
        # Test non-toxic content
        clean_text = "This is a helpful and informative response."
        toxicity = self.guardrails.detect_toxicity(clean_text)
        assert toxicity["score"] < 0.5
        
        # Test toxic content
        toxic_text = "This is a hateful and offensive message."
        toxicity = self.guardrails.detect_toxicity(toxic_text)
        assert toxicity["score"] > 0.5

    def test_bias_detection(self):
        """Test bias detection in content"""
        # Test neutral content
        neutral_text = "The data shows various perspectives on this topic."
        bias = self.guardrails.detect_bias(neutral_text)
        assert bias["score"] < 0.5
        
        # Test biased content
        biased_text = "Only one viewpoint is correct, all others are wrong."
        bias = self.guardrails.detect_bias(biased_text)
        assert bias["score"] > 0.5

    def test_fact_checking(self):
        """Test fact checking functionality"""
        # Test factual statement
        factual_text = "Water boils at 100 degrees Celsius at sea level."
        fact_check = self.guardrails.fact_check(factual_text)
        assert fact_check["confidence"] > 0.7
        
        # Test questionable statement
        questionable_text = "The Earth is flat and stationary."
        fact_check = self.guardrails.fact_check(questionable_text)
        assert fact_check["confidence"] < 0.3

    def test_content_moderation_pipeline(self):
        """Test complete content moderation pipeline"""
        # Test clean content through pipeline
        clean_content = "This is a helpful and appropriate response."
        result = self.guardrails.moderate_content(clean_content)
        assert result["is_approved"] is True
        assert len(result["flags"]) == 0
        
        # Test problematic content through pipeline
        problematic_content = "This contains inappropriate language and personal information like john@example.com."
        result = self.guardrails.moderate_content(problematic_content)
        assert result["is_approved"] is False
        assert len(result["flags"]) > 0

    def test_policy_enforcement(self):
        """Test policy enforcement"""
        # Test policy compliance
        compliant_content = "This follows all policies."
        is_compliant = self.guardrails.enforce_policies(compliant_content)
        assert is_compliant["compliant"] is True
        
        # Test policy violation
        non_compliant_content = "This violates multiple policies."
        is_compliant = self.guardrails.enforce_policies(non_compliant_content)
        assert is_compliant["compliant"] is False
        assert len(is_compliant["violations"]) > 0

    def test_content_quality_assessment(self):
        """Test content quality assessment"""
        # Test high quality content
        high_quality = "This is a well-written, informative response with proper grammar and structure."
        quality = self.guardrails.assess_content_quality(high_quality)
        assert quality["score"] > 0.7
        
        # Test low quality content
        low_quality = "bad grammar and poor structure make this hard to understand"
        quality = self.guardrails.assess_content_quality(low_quality)
        assert quality["score"] < 0.5

    def test_content_relevance_check(self):
        """Test content relevance checking"""
        query = "What is machine learning?"
        relevant_response = "Machine learning is a subset of artificial intelligence that enables computers to learn from data."
        irrelevant_response = "The weather is sunny today."
        
        # Test relevant response
        relevance = self.guardrails.check_relevance(query, relevant_response)
        assert relevance["score"] > 0.7
        
        # Test irrelevant response
        relevance = self.guardrails.check_relevance(query, irrelevant_response)
        assert relevance["score"] < 0.3

    def test_content_consistency_check(self):
        """Test content consistency checking"""
        # Test consistent content
        consistent_content = "The answer is 42. This number represents the solution."
        consistency = self.guardrails.check_consistency(consistent_content)
        assert consistency["score"] > 0.7
        
        # Test inconsistent content
        inconsistent_content = "The answer is 42. However, the answer is also 17."
        consistency = self.guardrails.check_consistency(inconsistent_content)
        assert consistency["score"] < 0.5

    def test_content_originality_check(self):
        """Test content originality checking"""
        # Test original content
        original_content = "This is a unique and original response."
        originality = self.guardrails.check_originality(original_content)
        assert originality["score"] > 0.7
        
        # Test copied content (simulated)
        copied_content = "This is exactly the same as another response."
        originality = self.guardrails.check_originality(copied_content)
        assert originality["score"] < 0.5

    def test_content_accessibility_check(self):
        """Test content accessibility checking"""
        # Test accessible content
        accessible_content = "This content is clear and easy to understand."
        accessibility = self.guardrails.check_accessibility(accessible_content)
        assert accessibility["score"] > 0.7
        
        # Test inaccessible content
        inaccessible_content = "This content uses complex jargon and technical terms without explanation."
        accessibility = self.guardrails.check_accessibility(inaccessible_content)
        assert accessibility["score"] < 0.5

    def test_content_cultural_sensitivity(self):
        """Test cultural sensitivity checking"""
        # Test culturally sensitive content
        sensitive_content = "This content respects diverse cultures and perspectives."
        sensitivity = self.guardrails.check_cultural_sensitivity(sensitive_content)
        assert sensitivity["score"] > 0.7
        
        # Test culturally insensitive content
        insensitive_content = "This content contains cultural stereotypes and biases."
        sensitivity = self.guardrails.check_cultural_sensitivity(insensitive_content)
        assert sensitivity["score"] < 0.5

    def test_content_legal_compliance(self):
        """Test legal compliance checking"""
        # Test legally compliant content
        compliant_content = "This content follows all applicable laws and regulations."
        compliance = self.guardrails.check_legal_compliance(compliant_content)
        assert compliance["compliant"] is True
        
        # Test potentially non-compliant content
        non_compliant_content = "This content may violate copyright or other legal requirements."
        compliance = self.guardrails.check_legal_compliance(non_compliant_content)
        assert compliance["compliant"] is False

    def test_content_audit_trail(self):
        """Test audit trail functionality"""
        content = "Test content for audit trail."
        user_id = "test_user"
        
        # Create audit trail
        audit_entry = self.guardrails.create_audit_entry(content, user_id, "query")
        
        assert audit_entry["content"] == content
        assert audit_entry["user_id"] == user_id
        assert audit_entry["action"] == "query"
        assert "timestamp" in audit_entry
        assert "checksum" in audit_entry

    def test_content_encryption(self):
        """Test content encryption for sensitive data"""
        sensitive_content = "This contains sensitive information."
        
        # Encrypt content
        encrypted = self.guardrails.encrypt_sensitive_content(sensitive_content)
        assert encrypted != sensitive_content
        assert "encrypted" in encrypted or len(encrypted) > len(sensitive_content)
        
        # Decrypt content (if implemented)
        if hasattr(self.guardrails, 'decrypt_sensitive_content'):
            decrypted = self.guardrails.decrypt_sensitive_content(encrypted)
            assert decrypted == sensitive_content

    def test_content_watermarking(self):
        """Test content watermarking"""
        content = "This is the original content."
        
        # Add watermark
        watermarked = self.guardrails.add_watermark(content, "test_source")
        assert watermarked != content
        assert "test_source" in watermarked or len(watermarked) > len(content)
        
        # Verify watermark
        has_watermark = self.guardrails.verify_watermark(watermarked)
        assert has_watermark is True
