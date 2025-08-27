# Created automatically by Cursor AI (2024-12-19)

import pytest
import json
import hmac
import hashlib
import time
from unittest.mock import Mock, patch
from jsonschema import validate, ValidationError
from app.services.slack_payload_validator import SlackPayloadValidator


class TestSlackPayloads:
    """Contract tests for Slack payload schemas"""

    @pytest.fixture
    def slack_event_schema(self):
        """Slack event payload schema"""
        return {
            "type": "object",
            "required": ["type", "event_id", "event_time", "event"],
            "properties": {
                "type": {"type": "string", "enum": ["event_callback"]},
                "event_id": {"type": "string"},
                "event_time": {"type": "integer"},
                "event": {
                    "type": "object",
                    "required": ["type"],
                    "properties": {
                        "type": {"type": "string"},
                        "user": {"type": "string"},
                        "text": {"type": "string"},
                        "channel": {"type": "string"},
                        "ts": {"type": "string"},
                        "team": {"type": "string"}
                    }
                },
                "team_id": {"type": "string"},
                "api_app_id": {"type": "string"}
            }
        }

    @pytest.fixture
    def slack_slash_command_schema(self):
        """Slack slash command payload schema"""
        return {
            "type": "object",
            "required": ["command", "text", "user_id", "channel_id", "team_id"],
            "properties": {
                "command": {"type": "string"},
                "text": {"type": "string"},
                "user_id": {"type": "string"},
                "channel_id": {"type": "string"},
                "team_id": {"type": "string"},
                "response_url": {"type": "string", "format": "uri"},
                "trigger_id": {"type": "string"},
                "api_app_id": {"type": "string"}
            }
        }

    @pytest.fixture
    def slack_oauth_schema(self):
        """Slack OAuth response schema"""
        return {
            "type": "object",
            "required": ["ok"],
            "properties": {
                "ok": {"type": "boolean"},
                "access_token": {"type": "string"},
                "token_type": {"type": "string"},
                "scope": {"type": "string"},
                "bot_user_id": {"type": "string"},
                "team": {
                    "type": "object",
                    "required": ["id", "name"],
                    "properties": {
                        "id": {"type": "string"},
                        "name": {"type": "string"},
                        "domain": {"type": "string"}
                    }
                },
                "enterprise": {"type": "object"},
                "authed_user": {
                    "type": "object",
                    "required": ["id"],
                    "properties": {
                        "id": {"type": "string"},
                        "scope": {"type": "string"},
                        "access_token": {"type": "string"},
                        "token_type": {"type": "string"}
                    }
                }
            }
        }

    @pytest.fixture
    def payload_validator(self):
        """Slack payload validator instance"""
        return SlackPayloadValidator()

    @pytest.mark.contract
    def test_slack_event_payload_validation(self, slack_event_schema):
        """Test Slack event payload validation"""
        
        # Valid event payload
        valid_event = {
            "type": "event_callback",
            "event_id": "Ev1234567890",
            "event_time": 1234567890,
            "event": {
                "type": "app_mention",
                "user": "U1234567890",
                "text": "<@BOT_ID> what is machine learning?",
                "channel": "C1234567890",
                "ts": "1234567890.123456",
                "team": "T1234567890"
            },
            "team_id": "T1234567890",
            "api_app_id": "A1234567890"
        }
        
        validate(valid_event, slack_event_schema)
        
        # Invalid event payload - missing required field
        invalid_event = {
            "type": "event_callback",
            "event_id": "Ev1234567890",
            "event": {
                "type": "app_mention"
                # Missing required fields
            }
        }
        
        with pytest.raises(ValidationError):
            validate(invalid_event, slack_event_schema)

    @pytest.mark.contract
    def test_slack_slash_command_payload_validation(self, slack_slash_command_schema):
        """Test Slack slash command payload validation"""
        
        # Valid slash command payload
        valid_command = {
            "command": "/askdoc",
            "text": "what is machine learning?",
            "user_id": "U1234567890",
            "channel_id": "C1234567890",
            "team_id": "T1234567890",
            "response_url": "https://hooks.slack.com/commands/T1234567890/1234567890/abcdef",
            "trigger_id": "1234567890.123456.abcdef",
            "api_app_id": "A1234567890"
        }
        
        validate(valid_command, slack_slash_command_schema)
        
        # Invalid slash command - missing required field
        invalid_command = {
            "command": "/askdoc",
            "text": "what is machine learning?",
            "user_id": "U1234567890"
            # Missing channel_id and team_id
        }
        
        with pytest.raises(ValidationError):
            validate(invalid_command, slack_slash_command_schema)

    @pytest.mark.contract
    def test_slack_oauth_payload_validation(self, slack_oauth_schema):
        """Test Slack OAuth response payload validation"""
        
        # Valid OAuth response
        valid_oauth = {
            "ok": True,
            "access_token": "xoxb-test-token",
            "token_type": "bot",
            "scope": "chat:write,commands",
            "bot_user_id": "BOT_ID",
            "team": {
                "id": "T1234567890",
                "name": "Test Team",
                "domain": "testteam"
            },
            "authed_user": {
                "id": "U1234567890",
                "scope": "chat:write",
                "access_token": "xoxp-user-token",
                "token_type": "user"
            }
        }
        
        validate(valid_oauth, slack_oauth_schema)
        
        # Invalid OAuth response - missing required field
        invalid_oauth = {
            "access_token": "xoxb-test-token",
            "team": {
                "id": "T1234567890",
                "name": "Test Team"
            }
            # Missing ok field
        }
        
        with pytest.raises(ValidationError):
            validate(invalid_oauth, slack_oauth_schema)

    @pytest.mark.contract
    def test_slack_url_verification_payload(self):
        """Test Slack URL verification payload"""
        
        url_verification_schema = {
            "type": "object",
            "required": ["type", "challenge", "token"],
            "properties": {
                "type": {"type": "string", "enum": ["url_verification"]},
                "challenge": {"type": "string"},
                "token": {"type": "string"}
            }
        }
        
        # Valid URL verification payload
        valid_verification = {
            "type": "url_verification",
            "challenge": "test_challenge_string",
            "token": "test_verification_token"
        }
        
        validate(valid_verification, url_verification_schema)

    @pytest.mark.contract
    def test_slack_interactive_message_payload(self):
        """Test Slack interactive message payload"""
        
        interactive_schema = {
            "type": "object",
            "required": ["type", "user", "actions", "callback_id"],
            "properties": {
                "type": {"type": "string", "enum": ["interactive_message"]},
                "user": {
                    "type": "object",
                    "required": ["id", "name"],
                    "properties": {
                        "id": {"type": "string"},
                        "name": {"type": "string"}
                    }
                },
                "actions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["name", "type", "value"],
                        "properties": {
                            "name": {"type": "string"},
                            "type": {"type": "string"},
                            "value": {"type": "string"}
                        }
                    }
                },
                "callback_id": {"type": "string"},
                "channel": {
                    "type": "object",
                    "required": ["id", "name"],
                    "properties": {
                        "id": {"type": "string"},
                        "name": {"type": "string"}
                    }
                }
            }
        }
        
        # Valid interactive message payload
        valid_interactive = {
            "type": "interactive_message",
            "user": {
                "id": "U1234567890",
                "name": "testuser"
            },
            "actions": [
                {
                    "name": "feedback",
                    "type": "button",
                    "value": "positive"
                }
            ],
            "callback_id": "qa_feedback",
            "channel": {
                "id": "C1234567890",
                "name": "general"
            }
        }
        
        validate(valid_interactive, interactive_schema)

    @pytest.mark.contract
    def test_slack_signature_validation(self, payload_validator):
        """Test Slack signature validation"""
        
        # Test signature generation
        timestamp = str(int(time.time()))
        body = "test_body_content"
        secret = "test_signing_secret"
        
        # Generate expected signature
        sig_basestring = f"v0:{timestamp}:{body}"
        expected_signature = f"v0={hmac.new(secret.encode(), sig_basestring.encode(), hashlib.sha256).hexdigest()}"
        
        # Test signature validation
        is_valid = payload_validator.validate_signature(
            timestamp=timestamp,
            body=body,
            signature=expected_signature,
            secret=secret
        )
        
        assert is_valid is True
        
        # Test invalid signature
        invalid_signature = "v0=invalid_signature"
        is_valid = payload_validator.validate_signature(
            timestamp=timestamp,
            body=body,
            signature=invalid_signature,
            secret=secret
        )
        
        assert is_valid is False

    @pytest.mark.contract
    def test_slack_timestamp_validation(self, payload_validator):
        """Test Slack timestamp validation"""
        
        # Test recent timestamp (within 5 minutes)
        recent_timestamp = str(int(time.time()))
        is_valid = payload_validator.validate_timestamp(recent_timestamp)
        assert is_valid is True
        
        # Test old timestamp (more than 5 minutes ago)
        old_timestamp = str(int(time.time()) - 360)  # 6 minutes ago
        is_valid = payload_validator.validate_timestamp(old_timestamp)
        assert is_valid is False

    @pytest.mark.contract
    def test_slack_event_type_validation(self, slack_event_schema):
        """Test Slack event type validation"""
        
        # Test valid event types
        valid_event_types = ["app_mention", "message", "reaction_added", "team_join"]
        
        for event_type in valid_event_types:
            event_payload = {
                "type": "event_callback",
                "event_id": "Ev1234567890",
                "event_time": 1234567890,
                "event": {
                    "type": event_type,
                    "user": "U1234567890",
                    "channel": "C1234567890"
                }
            }
            
            validate(event_payload, slack_event_schema)

    @pytest.mark.contract
    def test_slack_user_id_format_validation(self, slack_event_schema):
        """Test Slack user ID format validation"""
        
        # Valid user ID format
        valid_user_id = "U1234567890"
        
        event_payload = {
            "type": "event_callback",
            "event_id": "Ev1234567890",
            "event_time": 1234567890,
            "event": {
                "type": "app_mention",
                "user": valid_user_id,
                "channel": "C1234567890"
            }
        }
        
        validate(event_payload, slack_event_schema)
        
        # Invalid user ID format
        invalid_user_id = "invalid_user_id"
        
        event_payload["event"]["user"] = invalid_user_id
        
        # Should still validate as schema only checks type, not format
        validate(event_payload, slack_event_schema)

    @pytest.mark.contract
    def test_slack_channel_id_format_validation(self, slack_event_schema):
        """Test Slack channel ID format validation"""
        
        # Valid channel ID formats
        valid_channel_ids = ["C1234567890", "D1234567890", "G1234567890"]  # Channel, DM, Group
        
        for channel_id in valid_channel_ids:
            event_payload = {
                "type": "event_callback",
                "event_id": "Ev1234567890",
                "event_time": 1234567890,
                "event": {
                    "type": "app_mention",
                    "user": "U1234567890",
                    "channel": channel_id
                }
            }
            
            validate(event_payload, slack_event_schema)

    @pytest.mark.contract
    def test_slack_team_id_format_validation(self, slack_event_schema):
        """Test Slack team ID format validation"""
        
        # Valid team ID format
        valid_team_id = "T1234567890"
        
        event_payload = {
            "type": "event_callback",
            "event_id": "Ev1234567890",
            "event_time": 1234567890,
            "event": {
                "type": "app_mention",
                "user": "U1234567890",
                "channel": "C1234567890"
            },
            "team_id": valid_team_id
        }
        
        validate(event_payload, slack_event_schema)

    @pytest.mark.contract
    def test_slack_message_text_validation(self, slack_event_schema):
        """Test Slack message text validation"""
        
        # Test various message text formats
        test_messages = [
            "Simple text message",
            "Message with <@BOT_ID> mention",
            "Message with :emoji:",
            "Message with <https://example.com|link>",
            "Message with `code` formatting",
            "Message with *bold* and _italic_ formatting"
        ]
        
        for message_text in test_messages:
            event_payload = {
                "type": "event_callback",
                "event_id": "Ev1234567890",
                "event_time": 1234567890,
                "event": {
                    "type": "message",
                    "user": "U1234567890",
                    "channel": "C1234567890",
                    "text": message_text
                }
            }
            
            validate(event_payload, slack_event_schema)

    @pytest.mark.contract
    def test_slack_command_format_validation(self, slack_slash_command_schema):
        """Test Slack command format validation"""
        
        # Valid command formats
        valid_commands = ["/askdoc", "/help", "/settings", "/feedback"]
        
        for command in valid_commands:
            command_payload = {
                "command": command,
                "text": "test command text",
                "user_id": "U1234567890",
                "channel_id": "C1234567890",
                "team_id": "T1234567890"
            }
            
            validate(command_payload, slack_slash_command_schema)

    @pytest.mark.contract
    def test_slack_response_url_validation(self, slack_slash_command_schema):
        """Test Slack response URL format validation"""
        
        # Valid response URL format
        valid_response_url = "https://hooks.slack.com/commands/T1234567890/1234567890/abcdef"
        
        command_payload = {
            "command": "/askdoc",
            "text": "test command",
            "user_id": "U1234567890",
            "channel_id": "C1234567890",
            "team_id": "T1234567890",
            "response_url": valid_response_url
        }
        
        validate(command_payload, slack_slash_command_schema)
        
        # Invalid response URL format
        invalid_response_url = "not_a_valid_url"
        
        command_payload["response_url"] = invalid_response_url
        
        # Should still validate as schema only checks type, not format
        validate(command_payload, slack_slash_command_schema)

    @pytest.mark.contract
    def test_slack_oauth_token_validation(self, slack_oauth_schema):
        """Test Slack OAuth token format validation"""
        
        # Valid token formats
        valid_tokens = [
            "xoxb-test-token",
            "xoxp-user-token",
            "xoxa-app-token"
        ]
        
        for token in valid_tokens:
            oauth_payload = {
                "ok": True,
                "access_token": token,
                "team": {
                    "id": "T1234567890",
                    "name": "Test Team"
                }
            }
            
            validate(oauth_payload, slack_oauth_schema)

    @pytest.mark.contract
    def test_slack_scope_validation(self, slack_oauth_schema):
        """Test Slack OAuth scope validation"""
        
        # Valid scope formats
        valid_scopes = [
            "chat:write",
            "commands",
            "chat:write,commands",
            "chat:write,commands,users:read",
            "bot,chat:write,commands"
        ]
        
        for scope in valid_scopes:
            oauth_payload = {
                "ok": True,
                "access_token": "xoxb-test-token",
                "scope": scope,
                "team": {
                    "id": "T1234567890",
                    "name": "Test Team"
                }
            }
            
            validate(oauth_payload, slack_oauth_schema)

    @pytest.mark.contract
    def test_slack_payload_size_limits(self, slack_event_schema):
        """Test Slack payload size limits"""
        
        # Test reasonable payload size
        reasonable_text = "A reasonable length message" * 100  # ~2.7KB
        
        event_payload = {
            "type": "event_callback",
            "event_id": "Ev1234567890",
            "event_time": 1234567890,
            "event": {
                "type": "message",
                "user": "U1234567890",
                "channel": "C1234567890",
                "text": reasonable_text
            }
        }
        
        validate(event_payload, slack_event_schema)
        
        # Test very large payload (should still validate but may be rejected by Slack)
        large_text = "A very long message" * 10000  # ~180KB
        
        event_payload["event"]["text"] = large_text
        
        # Should still validate as schema doesn't enforce size limits
        validate(event_payload, slack_event_schema)

    @pytest.mark.contract
    def test_slack_payload_encoding_validation(self, payload_validator):
        """Test Slack payload encoding validation"""
        
        # Test UTF-8 encoding
        utf8_text = "Hello 世界 🌍"
        
        # Test that UTF-8 text is handled correctly
        is_valid = payload_validator.validate_encoding(utf8_text)
        assert is_valid is True
        
        # Test invalid encoding (this would be caught at the HTTP level)
        # In practice, this would be handled by the web framework

    @pytest.mark.contract
    def test_slack_payload_required_field_consistency(self, slack_event_schema, slack_slash_command_schema):
        """Test consistency of required fields across payload types"""
        
        # Both event and slash command payloads should have consistent ID formats
        event_payload = {
            "type": "event_callback",
            "event_id": "Ev1234567890",
            "event_time": 1234567890,
            "event": {
                "type": "app_mention",
                "user": "U1234567890",
                "channel": "C1234567890"
            }
        }
        
        command_payload = {
            "command": "/askdoc",
            "text": "test",
            "user_id": "U1234567890",
            "channel_id": "C1234567890",
            "team_id": "T1234567890"
        }
        
        # Both should validate
        validate(event_payload, slack_event_schema)
        validate(command_payload, slack_slash_command_schema)
        
        # Both should have consistent user ID format
        assert event_payload["event"]["user"].startswith("U")
        assert command_payload["user_id"].startswith("U")
