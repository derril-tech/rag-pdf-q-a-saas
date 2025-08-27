// Created automatically by Cursor AI (2025-01-27)

import {
    Controller,
    Post,
    Body,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { SlackService } from './slack.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('slack')
@Controller('slack')
export class SlackController {
    constructor(private readonly slackService: SlackService) { }

    @Post('install')
    @ApiOperation({ summary: 'Handle Slack OAuth installation' })
    @ApiResponse({
        status: 200,
        description: 'Installation successful',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string' },
                teamId: { type: 'string' },
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async install(
        @Body() installRequest: { code: string; state?: string },
    ): Promise<{ message: string; teamId: string }> {
        return this.slackService.handleInstall(installRequest);
    }

    @Post('events')
    @ApiOperation({ summary: 'Handle Slack events webhook' })
    @ApiResponse({
        status: 200,
        description: 'Event processed successfully',
        schema: {
            type: 'object',
            properties: {
                challenge: { type: 'string' },
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async events(
        @Body() event: any,
        @Request() req,
    ): Promise<{ challenge?: string }> {
        return this.slackService.handleEvent(event, req.headers);
    }

    @Post('ask')
    @ApiOperation({ summary: 'Handle Slack /askdoc command' })
    @ApiResponse({
        status: 200,
        description: 'Command processed successfully',
        schema: {
            type: 'object',
            properties: {
                text: { type: 'string' },
                attachments: { type: 'array' },
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Team or project not found' })
    async ask(
        @Body() askRequest: {
            text: string;
            user_id: string;
            team_id: string;
            channel_id: string;
            response_url: string;
        },
    ): Promise<{ text: string; attachments?: any[] }> {
        return this.slackService.handleAsk(askRequest);
    }

    @Post('connect')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Connect Slack to organization' })
    @ApiResponse({
        status: 200,
        description: 'Slack connected successfully',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string' },
                teamId: { type: 'string' },
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async connect(
        @Body() connectRequest: { teamId: string; projectId: string },
        @Request() req,
    ): Promise<{ message: string; teamId: string }> {
        return this.slackService.connect(connectRequest, req.user.id);
    }

    @Post('disconnect')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Disconnect Slack from organization' })
    @ApiResponse({
        status: 200,
        description: 'Slack disconnected successfully',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string' },
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async disconnect(
        @Body() disconnectRequest: { teamId: string },
        @Request() req,
    ): Promise<{ message: string }> {
        return this.slackService.disconnect(disconnectRequest, req.user.id);
    }
}
