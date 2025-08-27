# Created automatically by Cursor AI (2024-12-19)

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from app.services.slack_worker import SlackWorker
from app.services.qa_worker import QAWorker
from app.services.database_service import DatabaseService


class TestSlackIntegration:
    """Integration tests for Slack integration"""

    @pytest.fixture
    def sample_slack_event(self):
        """Sample Slack event for testing"""
        return {
            "type": "app_mention",
            "user": "U1234567890",
            "text": "<@BOT_ID> what is machine learning?",
            "channel": "C1234567890",
            "ts": "1234567890.123456",
            "team": "T1234567890"
        }

    @pytest.fixture
    def sample_slash_command(self):
        """Sample slash command for testing"""
        return {
            "command": "/askdoc",
            "text": "what is machine learning?",
            "user_id": "U1234567890",
            "channel_id": "C1234567890",
            "team_id": "T1234567890",
            "response_url": "https://hooks.slack.com/commands/T1234567890/1234567890/abcdef"
        }

    @pytest.fixture
    def mock_database(self):
        """Mock database service"""
        with patch('app.services.database_service.DatabaseService') as mock:
            mock_instance = Mock()
            mock_instance.get_slack_workspace.return_value = {
                "id": "workspace_123",
                "team_id": "T1234567890",
                "access_token": "xoxb-test-token",
                "bot_user_id": "BOT_ID"
            }
            mock_instance.get_project_by_slack_channel.return_value = {
                "id": "project_123",
                "name": "Test Project",
                "document_id": "doc_123"
            }
            mock_instance.create_slack_message.return_value = "msg_123"
            mock.return_value = mock_instance
            yield mock_instance

    @pytest.fixture
    def mock_qa_worker(self):
        """Mock QA worker"""
        with patch('app.services.qa_worker.QAWorker') as mock:
            mock_instance = Mock()
            mock_instance.process_query.return_value = {
                "status": "completed",
                "answer": "Machine learning is a subset of AI that enables computers to learn from data.",
                "citations": [
                    {"reference": "[1]", "source": "document1.pdf", "page": 1}
                ],
                "thread_id": "thread_123",
                "message_id": "msg_123"
            }
            mock.return_value = mock_instance
            yield mock_instance

    @pytest.fixture
    def mock_slack_client(self):
        """Mock Slack client"""
        with patch('app.services.slack_worker.SlackClient') as mock:
            mock_instance = Mock()
            mock_instance.chat_postMessage.return_value = {"ok": True, "ts": "1234567890.123456"}
            mock_instance.chat_postEphemeral.return_value = {"ok": True}
            mock_instance.oauth_v2_access.return_value = {
                "ok": True,
                "access_token": "xoxb-test-token",
                "team": {"id": "T1234567890", "name": "Test Team"},
                "bot_user_id": "BOT_ID"
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
    async def test_slack_oauth_installation(self, mock_database, mock_slack_client, mock_telemetry, mock_metrics):
        """Test Slack OAuth installation flow"""
        
        slack_worker = SlackWorker()
        
        # Test OAuth installation
        oauth_result = await slack_worker.handle_oauth_installation(
            code="test_oauth_code",
            state="test_state"
        )
        
        # Verify OAuth flow
        assert oauth_result["status"] == "installed"
        assert oauth_result["team_id"] == "T1234567890"
        assert oauth_result["bot_user_id"] == "BOT_ID"
        
        # Verify Slack client was called
        mock_slack_client.oauth_v2_access.assert_called_with(code="test_oauth_code")
        
        # Verify workspace was saved
        mock_database.save_slack_workspace.assert_called_with({
            "team_id": "T1234567890",
            "team_name": "Test Team",
            "access_token": "xoxb-test-token",
            "bot_user_id": "BOT_ID"
        })

    @pytest.mark.integration
    async def test_slack_slash_command_processing(self, sample_slash_command, mock_database, mock_qa_worker, mock_slack_client, mock_telemetry, mock_metrics):
        """Test Slack slash command processing"""
        
        slack_worker = SlackWorker()
        
        # Process slash command
        result = await slack_worker.handle_slash_command(sample_slash_command)
        
        # Verify result
        assert result["status"] == "processed"
        assert "answer" in result
        
        # Verify QA worker was called
        mock_qa_worker.process_query.assert_called_with(
            "what is machine learning?",
            "doc_123",
            "U1234567890"
        )
        
        # Verify Slack message was sent
        mock_slack_client.chat_postEphemeral.assert_called()
        
        # Verify message content
        message_call = mock_slack_client.chat_postEphemeral.call_args
        message_text = message_call[1]["text"]
        assert "machine learning" in message_text.lower()
        assert "[1]" in message_text  # Citation reference

    @pytest.mark.integration
    async def test_slack_event_processing(self, sample_slack_event, mock_database, mock_qa_worker, mock_slack_client, mock_telemetry, mock_metrics):
        """Test Slack event processing"""
        
        slack_worker = SlackWorker()
        
        # Process Slack event
        result = await slack_worker.handle_slack_event(sample_slack_event)
        
        # Verify result
        assert result["status"] == "processed"
        
        # Verify QA worker was called with extracted query
        mock_qa_worker.process_query.assert_called_with(
            "what is machine learning?",
            "doc_123",
            "U1234567890"
        )
        
        # Verify Slack message was sent
        mock_slack_client.chat_postMessage.assert_called()
        
        # Verify message was saved to database
        mock_database.create_slack_message.assert_called()

    @pytest.mark.integration
    async def test_slack_query_extraction(self, mock_database, mock_qa_worker, mock_slack_client, mock_telemetry, mock_metrics):
        """Test query extraction from Slack messages"""
        
        slack_worker = SlackWorker()
        
        # Test different message formats
        test_cases = [
            {
                "message": "<@BOT_ID> what is AI?",
                "expected_query": "what is AI?"
            },
            {
                "message": "Hey <@BOT_ID>, explain machine learning",
                "expected_query": "explain machine learning"
            },
            {
                "message": "<@BOT_ID>",
                "expected_query": None  # No query provided
            }
        ]
        
        for test_case in test_cases:
            extracted_query = slack_worker.extract_query_from_message(
                test_case["message"], 
                "BOT_ID"
            )
            
            assert extracted_query == test_case["expected_query"]

    @pytest.mark.integration
    async def test_slack_channel_mapping(self, mock_database, mock_qa_worker, mock_slack_client, mock_telemetry, mock_metrics):
        """Test Slack channel to project mapping"""
        
        slack_worker = SlackWorker()
        
        # Test channel mapping
        project = await slack_worker.get_project_for_channel("C1234567890", "T1234567890")
        
        # Verify project lookup
        assert project["id"] == "project_123"
        assert project["name"] == "Test Project"
        assert project["document_id"] == "doc_123"
        
        # Verify database was queried
        mock_database.get_project_by_slack_channel.assert_called_with(
            "C1234567890", 
            "T1234567890"
        )

    @pytest.mark.integration
    async def test_slack_message_formatting(self, mock_database, mock_qa_worker, mock_slack_client, mock_telemetry, mock_metrics):
        """Test Slack message formatting"""
        
        slack_worker = SlackWorker()
        
        # Test answer formatting
        qa_result = {
            "answer": "Machine learning is a subset of AI that enables computers to learn from data.",
            "citations": [
                {"reference": "[1]", "source": "document1.pdf", "page": 1},
                {"reference": "[2]", "source": "document2.pdf", "page": 3}
            ]
        }
        
        formatted_message = slack_worker.format_slack_message(qa_result)
        
        # Verify formatting
        assert "Machine learning is a subset of AI" in formatted_message
        assert "[1]" in formatted_message
        assert "[2]" in formatted_message
        assert "document1.pdf" in formatted_message
        assert "document2.pdf" in formatted_message

    @pytest.mark.integration
    async def test_slack_error_handling(self, sample_slash_command, mock_database, mock_qa_worker, mock_slack_client, mock_telemetry, mock_metrics):
        """Test error handling in Slack integration"""
        
        # Test QA worker error
        mock_qa_worker.process_query.side_effect = Exception("QA processing failed")
        
        slack_worker = SlackWorker()
        
        result = await slack_worker.handle_slash_command(sample_slash_command)
        
        # Verify error handling
        assert result["status"] == "error"
        assert "error" in result
        
        # Verify error message was sent to Slack
        mock_slack_client.chat_postEphemeral.assert_called()
        
        # Verify error metrics
        mock_metrics.record_counter.assert_called()
        
        # Test database error
        mock_database.get_project_by_slack_channel.side_effect = Exception("Database error")
        mock_qa_worker.process_query.side_effect = None
        
        result = await slack_worker.handle_slash_command(sample_slash_command)
        
        assert result["status"] == "error"

    @pytest.mark.integration
    async def test_slack_rate_limiting(self, sample_slash_command, mock_database, mock_qa_worker, mock_slack_client, mock_telemetry, mock_metrics):
        """Test rate limiting in Slack integration"""
        
        slack_worker = SlackWorker()
        
        # Test multiple rapid requests
        tasks = []
        for i in range(10):
            task = slack_worker.handle_slash_command(sample_slash_command)
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Some requests should be rate limited
        rate_limited = [r for r in results if isinstance(r, dict) and r.get("status") == "rate_limited"]
        assert len(rate_limited) > 0
        
        # Verify rate limiting metrics
        mock_metrics.record_counter.assert_called()

    @pytest.mark.integration
    async def test_slack_conversation_context(self, mock_database, mock_qa_worker, mock_slack_client, mock_telemetry, mock_metrics):
        """Test conversation context in Slack"""
        
        # Setup conversation history
        conversation_history = [
            {
                "user": "U1234567890",
                "text": "What is AI?",
                "ts": "1234567890.123456"
            },
            {
                "user": "BOT_ID",
                "text": "AI stands for Artificial Intelligence.",
                "ts": "1234567890.123457"
            }
        ]
        
        mock_database.get_slack_conversation_history.return_value = conversation_history
        
        slack_worker = SlackWorker()
        
        # Test follow-up question
        follow_up_event = {
            "type": "app_mention",
            "user": "U1234567890",
            "text": "<@BOT_ID> how does it relate to machine learning?",
            "channel": "C1234567890",
            "ts": "1234567890.123458"
        }
        
        result = await slack_worker.handle_slack_event(follow_up_event)
        
        # Verify context was included
        assert result["status"] == "processed"
        
        # Verify QA worker was called with context
        qa_call_args = mock_qa_worker.process_query.call_args
        # Context should be included in the query processing

    @pytest.mark.integration
    async def test_slack_message_threading(self, sample_slack_event, mock_database, mock_qa_worker, mock_slack_client, mock_telemetry, mock_metrics):
        """Test Slack message threading"""
        
        slack_worker = SlackWorker()
        
        # Test threaded response
        result = await slack_worker.handle_slack_event(sample_slack_event)
        
        # Verify thread was created
        mock_slack_client.chat_postMessage.assert_called()
        
        # Verify thread_ts was used for threading
        message_call = mock_slack_client.chat_postMessage.call_args
        assert "thread_ts" in message_call[1]
        assert message_call[1]["thread_ts"] == "1234567890.123456"

    @pytest.mark.integration
    async def test_slack_workspace_management(self, mock_database, mock_slack_client, mock_telemetry, mock_metrics):
        """Test Slack workspace management"""
        
        slack_worker = SlackWorker()
        
        # Test workspace installation
        workspace_data = {
            "team_id": "T1234567890",
            "team_name": "Test Team",
            "access_token": "xoxb-test-token",
            "bot_user_id": "BOT_ID"
        }
        
        result = await slack_worker.install_workspace(workspace_data)
        
        # Verify workspace was saved
        assert result["status"] == "installed"
        mock_database.save_slack_workspace.assert_called_with(workspace_data)
        
        # Test workspace removal
        result = await slack_worker.uninstall_workspace("T1234567890")
        
        # Verify workspace was removed
        assert result["status"] == "uninstalled"
        mock_database.remove_slack_workspace.assert_called_with("T1234567890")

    @pytest.mark.integration
    async def test_slack_performance_monitoring(self, sample_slash_command, mock_database, mock_qa_worker, mock_slack_client, mock_telemetry, mock_metrics):
        """Test performance monitoring in Slack integration"""
        
        slack_worker = SlackWorker()
        
        # Process command
        await slack_worker.handle_slash_command(sample_slash_command)
        
        # Verify performance metrics
        mock_metrics.record_histogram.assert_called()
        
        # Verify specific metrics
        calls = mock_metrics.record_histogram.call_args_list
        metric_names = [call[0][0] for call in calls]
        assert "slack_command_duration" in metric_names
        assert "slack_message_processing_duration" in metric_names
        
        # Verify telemetry
        mock_telemetry.create_span.assert_called()
        mock_telemetry.start_span.assert_called()
        mock_telemetry.end_span.assert_called()

    @pytest.mark.integration
    async def test_slack_security_validation(self, sample_slash_command, mock_database, mock_qa_worker, mock_slack_client, mock_telemetry, mock_metrics):
        """Test security validation in Slack integration"""
        
        slack_worker = SlackWorker()
        
        # Test signature validation
        with patch('app.services.slack_worker.validate_slack_signature') as mock_validate:
            mock_validate.return_value = True
            
            # Valid signature
            result = await slack_worker.handle_slash_command(sample_slash_command)
            assert result["status"] == "processed"
            
            # Invalid signature
            mock_validate.return_value = False
            result = await slack_worker.handle_slash_command(sample_slash_command)
            assert result["status"] == "unauthorized"

    @pytest.mark.integration
    async def test_slack_message_persistence(self, sample_slack_event, mock_database, mock_qa_worker, mock_slack_client, mock_telemetry, mock_metrics):
        """Test Slack message persistence"""
        
        slack_worker = SlackWorker()
        
        # Process event
        await slack_worker.handle_slack_event(sample_slack_event)
        
        # Verify message was saved
        mock_database.create_slack_message.assert_called()
        
        # Verify message data
        message_call = mock_database.create_slack_message.call_args
        message_data = message_call[0][0]
        
        assert message_data["slack_ts"] == "1234567890.123456"
        assert message_data["channel_id"] == "C1234567890"
        assert message_data["user_id"] == "U1234567890"
        assert message_data["team_id"] == "T1234567890"
        assert "what is machine learning?" in message_data["text"]

    @pytest.mark.integration
    async def test_slack_workspace_limits(self, sample_slash_command, mock_database, mock_qa_worker, mock_slack_client, mock_telemetry, mock_metrics):
        """Test workspace usage limits"""
        
        # Mock workspace with limits
        mock_database.get_slack_workspace.return_value = {
            "id": "workspace_123",
            "team_id": "T1234567890",
            "access_token": "xoxb-test-token",
            "bot_user_id": "BOT_ID",
            "plan": "free",
            "monthly_queries": 100,
            "queries_used": 100  # At limit
        }
        
        slack_worker = SlackWorker()
        
        # Test limit enforcement
        result = await slack_worker.handle_slash_command(sample_slash_command)
        
        # Should be rate limited due to plan limits
        assert result["status"] == "rate_limited"
        assert "limit" in result.get("error", "").lower()
        
        # Verify limit metrics
        mock_metrics.record_counter.assert_called()
