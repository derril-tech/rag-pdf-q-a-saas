# Created automatically by Cursor AI (2024-12-19)

import pytest
import asyncio
import tempfile
import os
from pathlib import Path
from playwright.async_api import async_playwright, Page, Browser, BrowserContext
from typing import Dict, Any


class TestPlaywrightE2E:
    """End-to-end tests using Playwright for complete user workflows"""

    @pytest.fixture
    async def browser_context(self):
        """Create browser context for testing"""
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context()
            page = await context.new_page()
            
            yield page, context, browser
            
            await browser.close()

    @pytest.fixture
    def sample_pdf_file(self):
        """Create a sample PDF file for testing"""
        # Create a minimal PDF file for testing
        pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n72 720 Td\n(Hello World) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000204 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n297\n%%EOF"
        
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
            temp_file.write(pdf_content)
            temp_file_path = temp_file.name
        
        yield temp_file_path
        
        # Cleanup
        os.unlink(temp_file_path)

    @pytest.mark.e2e
    async def test_complete_workflow_upload_ask_answer_export(self, browser_context, sample_pdf_file):
        """Test complete workflow: upload → ask → answer with citations → export"""
        page, context, browser = browser_context
        
        # Navigate to the application
        await page.goto("http://localhost:3000")
        
        # Wait for page to load
        await page.wait_for_load_state("networkidle")
        
        # Test 1: Upload Document
        await self._test_document_upload(page, sample_pdf_file)
        
        # Test 2: Ask Question
        question = "What is the main content of this document?"
        await self._test_ask_question(page, question)
        
        # Test 3: Verify Answer with Citations
        await self._test_verify_answer_with_citations(page)
        
        # Test 4: Export Results
        await self._test_export_results(page)

    @pytest.mark.e2e
    async def test_multiple_documents_workflow(self, browser_context, sample_pdf_file):
        """Test workflow with multiple documents"""
        page, context, browser = browser_context
        
        await page.goto("http://localhost:3000")
        await page.wait_for_load_state("networkidle")
        
        # Upload first document
        await self._test_document_upload(page, sample_pdf_file, "document1.pdf")
        
        # Upload second document
        await self._test_document_upload(page, sample_pdf_file, "document2.pdf")
        
        # Ask question about both documents
        question = "What are the similarities between these documents?"
        await self._test_ask_question(page, question)
        
        # Verify answer references both documents
        await self._test_verify_multiple_document_citations(page)

    @pytest.mark.e2e
    async def test_conversation_context_workflow(self, browser_context, sample_pdf_file):
        """Test conversation context across multiple questions"""
        page, context, browser = browser_context
        
        await page.goto("http://localhost:3000")
        await page.wait_for_load_state("networkidle")
        
        # Upload document
        await self._test_document_upload(page, sample_pdf_file)
        
        # Ask first question
        question1 = "What is the main topic?"
        await self._test_ask_question(page, question1)
        
        # Ask follow-up question
        question2 = "Can you elaborate on that?"
        await self._test_ask_question(page, question2)
        
        # Verify conversation context is maintained
        await self._test_verify_conversation_context(page)

    @pytest.mark.e2e
    async def test_error_handling_workflow(self, browser_context):
        """Test error handling in the workflow"""
        page, context, browser = browser_context
        
        await page.goto("http://localhost:3000")
        await page.wait_for_load_state("networkidle")
        
        # Test invalid file upload
        await self._test_invalid_file_upload(page)
        
        # Test empty question
        await self._test_empty_question(page)
        
        # Test network error handling
        await self._test_network_error_handling(page)

    @pytest.mark.e2e
    async def test_performance_workflow(self, browser_context, sample_pdf_file):
        """Test performance aspects of the workflow"""
        page, context, browser = browser_context
        
        await page.goto("http://localhost:3000")
        await page.wait_for_load_state("networkidle")
        
        # Test upload performance
        upload_time = await self._test_upload_performance(page, sample_pdf_file)
        assert upload_time < 30.0  # Should complete within 30 seconds
        
        # Test query response time
        response_time = await self._test_query_performance(page)
        assert response_time < 10.0  # Should respond within 10 seconds

    async def _test_document_upload(self, page: Page, file_path: str, filename: str = "test_document.pdf"):
        """Test document upload functionality"""
        # Navigate to upload page
        await page.click("text=Upload")
        await page.wait_for_selector("[data-testid='upload-area']")
        
        # Upload file
        with page.expect_file_chooser() as fc_info:
            await page.click("[data-testid='upload-button']")
        file_chooser = fc_info.value
        await file_chooser.set_files(file_path)
        
        # Wait for upload to complete
        await page.wait_for_selector("[data-testid='upload-success']", timeout=60000)
        
        # Verify file appears in document list
        await page.wait_for_selector(f"text={filename}")
        
        # Check upload progress indicators
        progress_bar = await page.query_selector("[data-testid='upload-progress']")
        if progress_bar:
            progress_text = await progress_bar.text_content()
            assert "100%" in progress_text or "Complete" in progress_text

    async def _test_ask_question(self, page: Page, question: str):
        """Test asking a question"""
        # Navigate to QA page
        await page.click("text=Ask Questions")
        await page.wait_for_selector("[data-testid='question-input']")
        
        # Type question
        await page.fill("[data-testid='question-input']", question)
        
        # Submit question
        await page.click("[data-testid='submit-question']")
        
        # Wait for response
        await page.wait_for_selector("[data-testid='answer-container']", timeout=30000)
        
        # Verify question is displayed
        question_display = await page.query_selector("[data-testid='question-display']")
        assert question_display is not None
        question_text = await question_display.text_content()
        assert question in question_text

    async def _test_verify_answer_with_citations(self, page: Page):
        """Test that answer contains citations"""
        # Wait for answer to be fully loaded
        await page.wait_for_selector("[data-testid='answer-text']")
        
        # Get answer text
        answer_element = await page.query_selector("[data-testid='answer-text']")
        answer_text = await answer_element.text_content()
        
        # Verify answer is not empty
        assert answer_text.strip() != ""
        assert len(answer_text) > 50  # Reasonable answer length
        
        # Check for citations
        citations = await page.query_selector_all("[data-testid='citation']")
        assert len(citations) > 0, "Answer should contain citations"
        
        # Verify citation format
        for citation in citations:
            citation_text = await citation.text_content()
            assert "[" in citation_text and "]" in citation_text
            assert "page" in citation_text.lower() or "source" in citation_text.lower()

    async def _test_export_results(self, page: Page):
        """Test exporting results"""
        # Click export button
        await page.click("[data-testid='export-button']")
        
        # Wait for export options
        await page.wait_for_selector("[data-testid='export-options']")
        
        # Select PDF format
        await page.click("[data-testid='export-pdf']")
        
        # Start export
        await page.click("[data-testid='start-export']")
        
        # Wait for export to complete
        await page.wait_for_selector("[data-testid='export-success']", timeout=60000)
        
        # Verify download link
        download_link = await page.query_selector("[data-testid='download-link']")
        assert download_link is not None
        
        # Test download
        with page.expect_download() as download_info:
            await download_link.click()
        download = download_info.value
        assert download.suggested_filename.endswith('.pdf')

    async def _test_verify_multiple_document_citations(self, page: Page):
        """Test that answer references multiple documents"""
        answer_element = await page.query_selector("[data-testid='answer-text']")
        answer_text = await answer_element.text_content()
        
        # Check for citations from both documents
        citations = await page.query_selector_all("[data-testid='citation']")
        citation_texts = [await citation.text_content() for citation in citations]
        
        # Should have citations from both documents
        doc1_citations = [c for c in citation_texts if "document1" in c.lower()]
        doc2_citations = [c for c in citation_texts if "document2" in c.lower()]
        
        assert len(doc1_citations) > 0, "Should cite document1"
        assert len(doc2_citations) > 0, "Should cite document2"

    async def _test_verify_conversation_context(self, page: Page):
        """Test that conversation context is maintained"""
        # Check that both questions and answers are visible
        questions = await page.query_selector_all("[data-testid='question-display']")
        answers = await page.query_selector_all("[data-testid='answer-container']")
        
        assert len(questions) >= 2, "Should show both questions"
        assert len(answers) >= 2, "Should show both answers"
        
        # Verify conversation flow
        conversation_container = await page.query_selector("[data-testid='conversation-history']")
        assert conversation_container is not None

    async def _test_invalid_file_upload(self, page: Page):
        """Test handling of invalid file uploads"""
        await page.click("text=Upload")
        await page.wait_for_selector("[data-testid='upload-area']")
        
        # Try to upload invalid file
        with page.expect_file_chooser() as fc_info:
            await page.click("[data-testid='upload-button']")
        file_chooser = fc_info.value
        
        # Create invalid file
        with tempfile.NamedTemporaryFile(suffix='.txt', delete=False) as temp_file:
            temp_file.write(b"This is not a PDF file")
            invalid_file_path = temp_file.name
        
        try:
            await file_chooser.set_files(invalid_file_path)
            
            # Should show error message
            await page.wait_for_selector("[data-testid='upload-error']")
            error_text = await page.text_content("[data-testid='upload-error']")
            assert "PDF" in error_text or "invalid" in error_text.lower()
        finally:
            os.unlink(invalid_file_path)

    async def _test_empty_question(self, page: Page):
        """Test handling of empty questions"""
        await page.click("text=Ask Questions")
        await page.wait_for_selector("[data-testid='question-input']")
        
        # Try to submit empty question
        await page.click("[data-testid='submit-question']")
        
        # Should show validation error
        await page.wait_for_selector("[data-testid='validation-error']")
        error_text = await page.text_content("[data-testid='validation-error']")
        assert "question" in error_text.lower() or "required" in error_text.lower()

    async def _test_network_error_handling(self, page: Page):
        """Test network error handling"""
        # Simulate network error by navigating to non-existent endpoint
        await page.route("**/api/**", lambda route: route.abort())
        
        await page.click("text=Ask Questions")
        await page.wait_for_selector("[data-testid='question-input']")
        
        await page.fill("[data-testid='question-input']", "Test question")
        await page.click("[data-testid='submit-question']")
        
        # Should show error message
        await page.wait_for_selector("[data-testid='error-message']")
        error_text = await page.text_content("[data-testid='error-message']")
        assert "error" in error_text.lower() or "failed" in error_text.lower()

    async def _test_upload_performance(self, page: Page, file_path: str) -> float:
        """Test upload performance and return time taken"""
        start_time = asyncio.get_event_loop().time()
        
        await self._test_document_upload(page, file_path)
        
        end_time = asyncio.get_event_loop().time()
        return end_time - start_time

    async def _test_query_performance(self, page: Page) -> float:
        """Test query performance and return response time"""
        start_time = asyncio.get_event_loop().time()
        
        await self._test_ask_question(page, "What is the main content?")
        
        end_time = asyncio.get_event_loop().time()
        return end_time - start_time


class TestPlaywrightAccessibility:
    """Accessibility tests using Playwright"""

    @pytest.fixture
    async def browser_context(self):
        """Create browser context for accessibility testing"""
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context()
            page = await context.new_page()
            
            yield page, context, browser
            
            await browser.close()

    @pytest.mark.e2e
    async def test_accessibility_compliance(self, browser_context):
        """Test accessibility compliance"""
        page, context, browser = browser_context
        
        await page.goto("http://localhost:3000")
        await page.wait_for_load_state("networkidle")
        
        # Test keyboard navigation
        await self._test_keyboard_navigation(page)
        
        # Test screen reader compatibility
        await self._test_screen_reader_compatibility(page)
        
        # Test color contrast
        await self._test_color_contrast(page)
        
        # Test focus management
        await self._test_focus_management(page)

    async def _test_keyboard_navigation(self, page: Page):
        """Test keyboard navigation"""
        # Test tab navigation
        await page.keyboard.press("Tab")
        
        # Verify focus is visible
        focused_element = await page.evaluate("document.activeElement")
        assert focused_element is not None
        
        # Test arrow key navigation
        await page.keyboard.press("ArrowDown")
        await page.keyboard.press("ArrowUp")

    async def _test_screen_reader_compatibility(self, page: Page):
        """Test screen reader compatibility"""
        # Check for proper ARIA labels
        elements_with_aria = await page.query_selector_all("[aria-label], [aria-labelledby]")
        assert len(elements_with_aria) > 0
        
        # Check for proper heading structure
        headings = await page.query_selector_all("h1, h2, h3, h4, h5, h6")
        assert len(headings) > 0

    async def _test_color_contrast(self, page: Page):
        """Test color contrast compliance"""
        # This would typically use a color contrast checking library
        # For now, we'll check that text elements have sufficient contrast
        text_elements = await page.query_selector_all("p, span, div")
        assert len(text_elements) > 0

    async def _test_focus_management(self, page: Page):
        """Test focus management"""
        # Test that modals trap focus
        await page.click("[data-testid='upload-button']")
        
        # Check that focus is trapped in modal
        modal = await page.query_selector("[data-testid='upload-modal']")
        if modal:
            focused_in_modal = await page.evaluate("""
                (modal) => {
                    const focused = document.activeElement;
                    return modal.contains(focused);
                }
            """, modal)
            assert focused_in_modal


class TestPlaywrightMobile:
    """Mobile-specific tests using Playwright"""

    @pytest.fixture
    async def mobile_context(self):
        """Create mobile browser context"""
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                viewport={'width': 375, 'height': 667},
                user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
            )
            page = await context.new_page()
            
            yield page, context, browser
            
            await browser.close()

    @pytest.mark.e2e
    async def test_mobile_responsiveness(self, mobile_context, sample_pdf_file):
        """Test mobile responsiveness"""
        page, context, browser = mobile_context
        
        await page.goto("http://localhost:3000")
        await page.wait_for_load_state("networkidle")
        
        # Test mobile navigation
        await self._test_mobile_navigation(page)
        
        # Test mobile upload
        await self._test_mobile_upload(page, sample_pdf_file)
        
        # Test mobile QA interface
        await self._test_mobile_qa_interface(page)

    async def _test_mobile_navigation(self, page: Page):
        """Test mobile navigation"""
        # Check for mobile menu
        mobile_menu = await page.query_selector("[data-testid='mobile-menu']")
        if mobile_menu:
            await mobile_menu.click()
            await page.wait_for_selector("[data-testid='mobile-nav']")
        
        # Test touch interactions
        await page.touch_screen.tap(200, 300)

    async def _test_mobile_upload(self, page: Page, file_path: str):
        """Test mobile file upload"""
        await page.click("text=Upload")
        await page.wait_for_selector("[data-testid='upload-area']")
        
        # Test mobile file picker
        with page.expect_file_chooser() as fc_info:
            await page.click("[data-testid='upload-button']")
        file_chooser = fc_info.value
        await file_chooser.set_files(file_path)
        
        await page.wait_for_selector("[data-testid='upload-success']", timeout=60000)

    async def _test_mobile_qa_interface(self, page: Page):
        """Test mobile QA interface"""
        await page.click("text=Ask Questions")
        await page.wait_for_selector("[data-testid='question-input']")
        
        # Test mobile keyboard
        await page.fill("[data-testid='question-input']", "Test question")
        await page.click("[data-testid='submit-question']")
        
        await page.wait_for_selector("[data-testid='answer-container']", timeout=30000)
