# Created automatically by Cursor AI (2025-01-27)

import asyncio
import time
from typing import Dict, Any, List

import nats
from nats.aio.client import Client as NATS
import redis.asyncio as redis

from app.core.config import settings
from app.core.logging import WorkerLogger
from app.models.jobs import SlackJob, QAJob


class SlackWorker:
    """Worker for processing Slack events"""
    
    def __init__(self):
        self.name = "slack"
        self.logger = WorkerLogger(self.name)
        self.is_running = False
        self.processed_jobs = 0
        self.failed_jobs = 0
        
        # External services
        self.nats_client: NATS = None
        self.redis_client: redis.Redis = None
    
    async def start(self) -> None:
        """Start the Slack worker"""
        self.logger.log_worker_start()
        self.is_running = True
        
        # Initialize connections
        await self._init_connections()
        
        # Start processing loop
        while self.is_running:
            try:
                await self._process_jobs()
                await asyncio.sleep(1)
            except Exception as e:
                self.logger.logger.error(f"Error in Slack worker: {e}")
                await asyncio.sleep(5)
    
    async def stop(self) -> None:
        """Stop the Slack worker"""
        self.logger.log_worker_stop()
        self.is_running = False
        
        if self.nats_client:
            await self.nats_client.close()
        if self.redis_client:
            await self.redis_client.close()
    
    async def _init_connections(self) -> None:
        """Initialize external service connections"""
        # Connect to NATS
        self.nats_client = nats.NATS()
        await self.nats_client.connect(settings.NATS_URL)
        
        # Connect to Redis
        self.redis_client = redis.from_url(settings.REDIS_URL)
    
    async def _process_jobs(self) -> None:
        """Process Slack jobs from NATS"""
        try:
            # Subscribe to Slack jobs
            subscription = await self.nats_client.subscribe("jobs.slack")
            
            async for msg in subscription.messages:
                try:
                    job_data = msg.data.decode()
                    job = SlackJob.parse_raw(job_data)
                    
                    await self._process_slack_job(job)
                    
                    # Acknowledge message
                    await msg.ack()
                    
                except Exception as e:
                    self.logger.log_job_error(job.event_type, e)
                    self.failed_jobs += 1
                    await msg.nak()
        
        except Exception as e:
            self.logger.logger.error(f"Error processing jobs: {e}")
    
    async def _process_slack_job(self, job: SlackJob) -> None:
        """Process a single Slack job"""
        start_time = time.time()
        job_id = f"slack_{job.event_type}_{int(start_time)}"
        
        self.logger.log_job_start(job_id, "slack", event_type=job.event_type, team_id=job.team_id)
        
        try:
            if job.event_type == "oauth_install":
                await self._handle_oauth_install(job)
            elif job.event_type == "slash_command":
                await self._handle_slash_command(job)
            elif job.event_type == "event_callback":
                await self._handle_event_callback(job)
            else:
                self.logger.logger.warning(f"Unknown Slack event type: {job.event_type}")
            
            duration = time.time() - start_time
            self.logger.log_job_success(job_id, duration, event_type=job.event_type)
            self.processed_jobs += 1
            
        except Exception as e:
            self.logger.log_job_error(job_id, e, event_type=job.event_type)
            raise
    
    async def _handle_oauth_install(self, job: SlackJob) -> None:
        """Handle OAuth installation"""
        try:
            # Extract OAuth data
            oauth_data = job.payload
            
            # Store team info in database
            await self._store_team_info(
                team_id=job.team_id,
                access_token=oauth_data.get("access_token"),
                bot_user_id=oauth_data.get("bot_user_id"),
                team_name=oauth_data.get("team_name"),
            )
            
            # Send welcome message
            await self._send_welcome_message(job.team_id)
            
        except Exception as e:
            raise Exception(f"OAuth install failed: {e}")
    
    async def _handle_slash_command(self, job: SlackJob) -> None:
        """Handle slash command"""
        try:
            command_data = job.payload
            
            if command_data.get("command") == "/askdoc":
                await self._handle_askdoc_command(job)
            else:
                self.logger.logger.warning(f"Unknown slash command: {command_data.get('command')}")
                
        except Exception as e:
            raise Exception(f"Slash command handling failed: {e}")
    
    async def _handle_askdoc_command(self, job: SlackJob) -> None:
        """Handle /askdoc command"""
        try:
            command_data = job.payload
            query = command_data.get("text", "").strip()
            user_id = command_data.get("user_id")
            channel_id = command_data.get("channel_id")
            response_url = command_data.get("response_url")
            
            if not query:
                await self._send_slack_response(
                    response_url,
                    "Please provide a question. Usage: `/askdoc <your question>`"
                )
                return
            
            # Get org/project context
            context = await self._get_org_project_context(job.team_id)
            if not context:
                await self._send_slack_response(
                    response_url,
                    "This Slack workspace is not connected to any project. Please contact your administrator."
                )
                return
            
            # Validate user access
            if not await self._validate_user_access(job.team_id, user_id, context["project_id"]):
                await self._send_slack_response(
                    response_url,
                    "You don't have access to this project. Please contact your administrator."
                )
                return
            
            # Get user context
            user_context = await self._get_user_context(job.team_id, user_id)
            
            # Process the question with context
            answer = await self._process_question_with_context(
                query, context, user_context
            )
            
            # Send response
            await self._send_slack_response(response_url, answer)
            
        except Exception as e:
            raise Exception(f"AskDoc command failed: {e}")
    
    async def _handle_event_callback(self, job: SlackJob) -> None:
        """Handle event callbacks"""
        try:
            event_data = job.payload
            event_type = event_data.get("event", {}).get("type")
            
            if event_type == "app_mention":
                await self._handle_app_mention(job)
            elif event_type == "message":
                await self._handle_message_event(job)
            elif event_type == "reaction_added":
                await self._handle_reaction_event(job)
            elif event_type == "channel_created":
                await self._handle_channel_event(job)
            elif event_type == "team_join":
                await self._handle_team_join_event(job)
            else:
                self.logger.logger.info(f"Unhandled event type: {event_type}")
                
        except Exception as e:
            raise Exception(f"Event callback handling failed: {e}")
    
    async def _handle_message_event(self, job: SlackJob) -> None:
        """Handle message events"""
        try:
            event_data = job.payload.get("event", {})
            message_type = event_data.get("subtype")
            
            # Only process regular messages (not bot messages, etc.)
            if message_type is None:
                text = event_data.get("text", "")
                user_id = event_data.get("user")
                channel_id = event_data.get("channel")
                
                # Check if message contains a question pattern
                if self._is_question(text):
                    await self._handle_question_in_message(job, text, user_id, channel_id)
                    
        except Exception as e:
            raise Exception(f"Message event handling failed: {e}")
    
    async def _handle_reaction_event(self, job: SlackJob) -> None:
        """Handle reaction events"""
        try:
            event_data = job.payload.get("event", {})
            reaction = event_data.get("reaction")
            user_id = event_data.get("user")
            item = event_data.get("item", {})
            
            # Handle specific reactions (e.g., question mark for help)
            if reaction == "question":
                await self._handle_question_reaction(job, user_id, item)
                
        except Exception as e:
            raise Exception(f"Reaction event handling failed: {e}")
    
    async def _handle_channel_event(self, job: SlackJob) -> None:
        """Handle channel events"""
        try:
            event_data = job.payload.get("event", {})
            channel_id = event_data.get("channel", {}).get("id")
            channel_name = event_data.get("channel", {}).get("name")
            
            # Store channel info in database
            await self._store_channel_info(job.team_id, channel_id, channel_name)
            
        except Exception as e:
            raise Exception(f"Channel event handling failed: {e}")
    
    async def _handle_team_join_event(self, job: SlackJob) -> None:
        """Handle team join events"""
        try:
            event_data = job.payload.get("event", {})
            user_id = event_data.get("user", {}).get("id")
            user_name = event_data.get("user", {}).get("name")
            
            # Send welcome message to new user
            await self._send_user_welcome_message(job.team_id, user_id, user_name)
            
        except Exception as e:
            raise Exception(f"Team join event handling failed: {e}")
    
    def _is_question(self, text: str) -> bool:
        """Check if text contains a question"""
        question_indicators = ["?", "what", "how", "why", "when", "where", "who", "which"]
        text_lower = text.lower()
        
        # Check for question mark
        if "?" in text:
            return True
        
        # Check for question words at the beginning
        for indicator in question_indicators:
            if text_lower.startswith(indicator):
                return True
        
        return False
    
    async def _handle_question_in_message(self, job: SlackJob, text: str, user_id: str, channel_id: str) -> None:
        """Handle questions found in regular messages"""
        try:
            # Get org/project context
            context = await self._get_org_project_context(job.team_id)
            if not context:
                return
            
            # Validate user access
            if not await self._validate_user_access(job.team_id, user_id, context["project_id"]):
                return
            
            # Get user context
            user_context = await self._get_user_context(job.team_id, user_id)
            
            # Process the question with context
            answer = await self._process_question_with_context(
                text, context, user_context
            )
            
            # Send response as thread reply
            await self._send_thread_reply(channel_id, answer, text)
            
        except Exception as e:
            self.logger.logger.error(f"Failed to handle question in message: {e}")
    
    async def _handle_question_reaction(self, job: SlackJob, user_id: str, item: dict) -> None:
        """Handle question mark reactions"""
        try:
            # Get the original message
            message_ts = item.get("ts")
            channel_id = item.get("channel")
            
            if message_ts and channel_id:
                # Retrieve the original message and process it
                original_message = await self._get_message(channel_id, message_ts)
                if original_message:
                    await self._handle_question_in_message(job, original_message, user_id, channel_id)
                    
        except Exception as e:
            self.logger.logger.error(f"Failed to handle question reaction: {e}")
    
    async def _store_channel_info(self, team_id: str, channel_id: str, channel_name: str) -> None:
        """Store channel information in database"""
        try:
            # This would store channel info in the database
            # Implementation depends on your database service
            pass
        except Exception as e:
            self.logger.logger.error(f"Failed to store channel info: {e}")
    
    async def _send_user_welcome_message(self, team_id: str, user_id: str, user_name: str) -> None:
        """Send welcome message to new user"""
        try:
            welcome_text = f"Welcome to the team, <@{user_id}>! 👋\n\nYou can ask questions about your documents using:\n• `/askdoc <your question>` - Ask a specific question\n• Mention me in a channel: `@AskDoc <your question>`\n• Add a ❓ reaction to any message to get help"
            
            # This would send a DM to the new user
            # Implementation depends on your Slack integration
            pass
        except Exception as e:
            self.logger.logger.error(f"Failed to send user welcome message: {e}")
    
    async def _get_message(self, channel_id: str, timestamp: str) -> str:
        """Get message content by timestamp"""
        try:
            # This would use Slack Web API to get message
            # Implementation depends on your Slack integration
            return "Original message content"
        except Exception as e:
            self.logger.logger.error(f"Failed to get message: {e}")
            return None
    
    async def _send_thread_reply(self, channel_id: str, answer: str, original_text: str) -> None:
        """Send reply in thread"""
        try:
            # This would use Slack Web API to send thread reply
            # Implementation depends on your Slack integration
            pass
        except Exception as e:
            self.logger.logger.error(f"Failed to send thread reply: {e}")
    
    async def _handle_app_mention(self, job: SlackJob) -> None:
        """Handle app mention events"""
        try:
            event_data = job.payload.get("event", {})
            text = event_data.get("text", "")
            user_id = event_data.get("user")
            channel_id = event_data.get("channel")
            
            # Extract question from mention
            # Remove bot mention from text
            question = text.split(">", 1)[1].strip() if ">" in text else text
            
            if not question:
                return
            
            # Get org/project context
            context = await self._get_org_project_context(job.team_id)
            if not context:
                return
            
            # Validate user access
            if not await self._validate_user_access(job.team_id, user_id, context["project_id"]):
                return
            
            # Get user context
            user_context = await self._get_user_context(job.team_id, user_id)
            
            # Process the question with context
            answer = await self._process_question_with_context(
                question, context, user_context
            )
            
            # Send response
            await self._send_channel_message(channel_id, answer)
            
        except Exception as e:
            raise Exception(f"App mention handling failed: {e}")
    
    async def _store_team_info(self, team_id: str, access_token: str, bot_user_id: str, team_name: str) -> None:
        """Store team information in database"""
        try:
            # This would store team info in the database
            # Implementation depends on your database service
            pass
        except Exception as e:
            self.logger.logger.error(f"Failed to store team info: {e}")
            raise
    
    async def _get_team_project(self, team_id: str) -> str:
        """Get project ID for team"""
        try:
            # This would query the database for team's project
            # Implementation depends on your database service
            return "default-project-id"
        except Exception as e:
            self.logger.logger.error(f"Failed to get team project: {e}")
            return None
    
    async def _get_org_project_context(self, team_id: str) -> dict:
        """Get organization and project context for team"""
        try:
            # This would query the database for team's org/project mapping
            # Implementation depends on your database service
            return {
                "org_id": "default-org-id",
                "project_id": "default-project-id",
                "org_name": "Default Organization",
                "project_name": "Default Project"
            }
        except Exception as e:
            self.logger.logger.error(f"Failed to get org/project context: {e}")
            return None
    
    async def _validate_user_access(self, team_id: str, user_id: str, project_id: str) -> bool:
        """Validate user has access to project"""
        try:
            # This would check user permissions in the database
            # Implementation depends on your database service
            return True
        except Exception as e:
            self.logger.logger.error(f"Failed to validate user access: {e}")
            return False
    
    async def _get_user_context(self, team_id: str, user_id: str) -> dict:
        """Get user context and preferences"""
        try:
            # This would query user preferences and context
            # Implementation depends on your database service
            return {
                "user_id": user_id,
                "preferences": {
                    "response_style": "concise",
                    "include_citations": True,
                    "language": "en"
                }
            }
        except Exception as e:
            self.logger.logger.error(f"Failed to get user context: {e}")
            return None
    
    async def _process_question(self, question: str, project_id: str) -> str:
        """Process a question and return answer"""
        try:
            # This would call the QA service
            # For now, return a placeholder
            return f"Answer to: {question}\n\n*This is a placeholder response. The actual QA service would be called here.*"
        except Exception as e:
            return f"Sorry, I couldn't process your question: {str(e)}"
    
    async def _process_question_with_context(self, question: str, context: dict, user_context: dict) -> str:
        """Process a question with org/project/user context"""
        try:
            # Log context for debugging
            self.logger.logger.info(f"Processing question with context: org={context.get('org_name')}, project={context.get('project_name')}, user={user_context.get('user_id')}")
            
            # Create QA job
            qa_job = QAJob(
                query=question,
                project_id=context["project_id"],
                org_id=context["org_id"],
                user_id=user_context.get("user_id"),
                thread_id=None,  # Slack doesn't use threads like web UI
                source="slack",
                metadata={
                    "slack_team_id": context.get("team_id"),
                    "slack_channel_id": context.get("channel_id"),
                    "user_preferences": user_context.get("preferences", {})
                }
            )
            
            # Publish to NATS for QA worker
            await self._publish_qa_job(qa_job)
            
            # Generate a snippet of the question
            snippet = self._generate_question_snippet(question)
            
            # Create thread link (placeholder for now)
            thread_link = self._generate_thread_link(context["project_id"], qa_job.query)
            
            # Build response with snippet and link
            answer = f"*Question:* {snippet}\n\n"
            answer += f"*Context:* {context.get('org_name')} > {context.get('project_name')}\n\n"
            answer += f"*Processing your request...*\n\n"
            answer += f"📄 *View full conversation:* {thread_link}"
            
            return answer
            
        except Exception as e:
            return f"Sorry, I couldn't process your question: {str(e)}"
    
    def _generate_question_snippet(self, question: str, max_length: int = 100) -> str:
        """Generate a snippet of the question"""
        if len(question) <= max_length:
            return question
        
        # Truncate and add ellipsis
        return question[:max_length-3] + "..."
    
    def _generate_thread_link(self, project_id: str, query: str) -> str:
        """Generate a link to the thread in the web UI"""
        try:
            # This would generate a link to the web UI thread
            # For now, return a placeholder
            base_url = settings.FRONTEND_URL or "https://app.rag-pdf-qa.com"
            encoded_query = query.replace(" ", "+")
            return f"{base_url}/projects/{project_id}/chat?q={encoded_query}"
        except Exception as e:
            self.logger.logger.error(f"Failed to generate thread link: {e}")
            return "https://app.rag-pdf-qa.com"
    
    async def _publish_qa_job(self, qa_job: QAJob) -> None:
        """Publish QA job to NATS"""
        try:
            import json
            
            # Serialize job
            job_data = qa_job.json()
            
            # Publish to NATS
            await self.nats_client.publish("jobs.qa", job_data.encode())
            
            self.logger.logger.info(f"Published QA job for query: {qa_job.query[:50]}...")
            
        except Exception as e:
            self.logger.logger.error(f"Failed to publish QA job: {e}")
            raise
    
    async def _send_slack_response(self, response_url: str, text: str) -> None:
        """Send response to Slack"""
        try:
            import httpx
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    response_url,
                    json={
                        "text": text,
                        "response_type": "in_channel"
                    }
                )
                response.raise_for_status()
                
        except Exception as e:
            self.logger.logger.error(f"Failed to send Slack response: {e}")
    
    async def _send_channel_message(self, channel_id: str, text: str) -> None:
        """Send message to Slack channel"""
        try:
            # This would use Slack Web API to send message
            # Implementation depends on your Slack integration
            pass
        except Exception as e:
            self.logger.logger.error(f"Failed to send channel message: {e}")
    
    async def _send_welcome_message(self, team_id: str) -> None:
        """Send welcome message to team"""
        try:
            # This would send a welcome message to the team
            # Implementation depends on your Slack integration
            pass
        except Exception as e:
            self.logger.logger.error(f"Failed to send welcome message: {e}")
