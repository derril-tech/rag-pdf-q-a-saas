// Created automatically by Cursor AI (2025-01-27)

import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
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
    ApiParam,
    ApiQuery,
} from '@nestjs/swagger';
import { ThreadsService } from './threads.service';
import {
    CreateThreadDto,
    ThreadResponseDto,
    CreateMessageDto,
    MessageResponseDto,
} from '../dto/qa.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('threads')
@Controller('threads')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ThreadsController {
    constructor(private readonly threadsService: ThreadsService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new conversation thread' })
    @ApiResponse({
        status: 201,
        description: 'Thread created successfully',
        type: ThreadResponseDto,
    })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async createThread(
        @Body() createThreadDto: CreateThreadDto,
        @Query('projectId') projectId: string,
        @Request() req,
    ): Promise<ThreadResponseDto> {
        return this.threadsService.create(createThreadDto, projectId, req.user.id);
    }

    @Get()
    @ApiOperation({ summary: 'Get threads for a project' })
    @ApiQuery({ name: 'projectId', description: 'Project ID' })
    @ApiQuery({ name: 'page', description: 'Page number', required: false })
    @ApiQuery({ name: 'limit', description: 'Items per page', required: false })
    @ApiResponse({
        status: 200,
        description: 'List of threads',
        type: [ThreadResponseDto],
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async getThreads(
        @Query('projectId') projectId: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Request() req,
    ): Promise<ThreadResponseDto[]> {
        return this.threadsService.findAll(projectId, page, limit, req.user.id);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get thread by ID' })
    @ApiParam({ name: 'id', description: 'Thread ID' })
    @ApiResponse({
        status: 200,
        description: 'Thread details',
        type: ThreadResponseDto,
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Thread not found' })
    async getThread(
        @Param('id') id: string,
        @Request() req,
    ): Promise<ThreadResponseDto> {
        return this.threadsService.findOne(id, req.user.id);
    }

    @Post(':id/messages')
    @ApiOperation({ summary: 'Add a message to a thread' })
    @ApiParam({ name: 'id', description: 'Thread ID' })
    @ApiResponse({
        status: 201,
        description: 'Message added successfully',
        type: MessageResponseDto,
    })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Thread not found' })
    async addMessage(
        @Param('id') id: string,
        @Body() createMessageDto: CreateMessageDto,
        @Request() req,
    ): Promise<MessageResponseDto> {
        return this.threadsService.addMessage(id, createMessageDto, req.user.id);
    }

    @Get(':id/messages')
    @ApiOperation({ summary: 'Get messages in a thread' })
    @ApiParam({ name: 'id', description: 'Thread ID' })
    @ApiQuery({ name: 'page', description: 'Page number', required: false })
    @ApiQuery({ name: 'limit', description: 'Items per page', required: false })
    @ApiResponse({
        status: 200,
        description: 'List of messages',
        type: [MessageResponseDto],
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Thread not found' })
    async getMessages(
        @Param('id') id: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Request() req,
    ): Promise<MessageResponseDto[]> {
        return this.threadsService.getMessages(id, page, limit, req.user.id);
    }

    @Get(':id/export')
    @ApiOperation({ summary: 'Export thread as markdown, JSON, or PDF' })
    @ApiParam({ name: 'id', description: 'Thread ID' })
    @ApiQuery({ name: 'format', description: 'Export format (markdown, json, pdf)' })
    @ApiResponse({
        status: 200,
        description: 'Export download URL',
        schema: {
            type: 'object',
            properties: {
                downloadUrl: { type: 'string' },
                expiresAt: { type: 'string' },
                format: { type: 'string' },
                size: { type: 'number' },
            },
        },
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Thread not found' })
    async exportThread(
        @Param('id') id: string,
        @Query('format') format: string,
        @Request() req,
    ): Promise<{ downloadUrl: string; expiresAt: string; format: string; size: number }> {
        return this.threadsService.export(id, format, req.user.id);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete thread' })
    @ApiParam({ name: 'id', description: 'Thread ID' })
    @ApiResponse({ status: 204, description: 'Thread deleted successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Thread not found' })
    async deleteThread(
        @Param('id') id: string,
        @Request() req,
    ): Promise<void> {
        await this.threadsService.remove(id, req.user.id);
    }
}
