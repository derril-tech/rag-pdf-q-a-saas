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
import { DocumentsService } from './documents.service';
import {
    CreateDocumentDto,
    UpdateDocumentDto,
    DocumentResponseDto,
    UploadUrlRequestDto,
    UploadUrlResponseDto,
} from '../dto/document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('documents')
@Controller('documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentsController {
    constructor(private readonly documentsService: DocumentsService) { }

    @Post('upload-url')
    @ApiOperation({ summary: 'Get presigned URL for document upload' })
    @ApiResponse({
        status: 200,
        description: 'Presigned upload URL',
        type: UploadUrlResponseDto,
    })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async getUploadUrl(
        @Body() uploadUrlRequestDto: UploadUrlRequestDto,
        @Query('projectId') projectId: string,
        @Request() req,
    ): Promise<UploadUrlResponseDto> {
        return this.documentsService.getUploadUrl(uploadUrlRequestDto, projectId, req.user.id);
    }

    @Post()
    @ApiOperation({ summary: 'Create a new document record' })
    @ApiResponse({
        status: 201,
        description: 'Document created successfully',
        type: DocumentResponseDto,
    })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async createDocument(
        @Body() createDocumentDto: CreateDocumentDto,
        @Request() req,
    ): Promise<DocumentResponseDto> {
        return this.documentsService.create(createDocumentDto, req.user.id);
    }

    @Post(':id/process')
    @HttpCode(HttpStatus.ACCEPTED)
    @ApiOperation({ summary: 'Trigger document processing (ingest and embed)' })
    @ApiParam({ name: 'id', description: 'Document ID' })
    @ApiResponse({ status: 202, description: 'Processing started' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Document not found' })
    async processDocument(
        @Param('id') id: string,
        @Request() req,
    ): Promise<{ message: string }> {
        await this.documentsService.process(id, req.user.id);
        return { message: 'Document processing started' };
    }

    @Get()
    @ApiOperation({ summary: 'Get documents for a project' })
    @ApiQuery({ name: 'projectId', description: 'Project ID' })
    @ApiQuery({ name: 'status', description: 'Document status filter', required: false })
    @ApiQuery({ name: 'page', description: 'Page number', required: false })
    @ApiQuery({ name: 'limit', description: 'Items per page', required: false })
    @ApiResponse({
        status: 200,
        description: 'List of documents',
        type: [DocumentResponseDto],
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async getDocuments(
        @Query('projectId') projectId: string,
        @Query('status') status?: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Request() req,
    ): Promise<DocumentResponseDto[]> {
        return this.documentsService.findAll(projectId, status, page, limit, req.user.id);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get document by ID' })
    @ApiParam({ name: 'id', description: 'Document ID' })
    @ApiResponse({
        status: 200,
        description: 'Document details',
        type: DocumentResponseDto,
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Document not found' })
    async getDocument(
        @Param('id') id: string,
        @Request() req,
    ): Promise<DocumentResponseDto> {
        return this.documentsService.findOne(id, req.user.id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update document' })
    @ApiParam({ name: 'id', description: 'Document ID' })
    @ApiResponse({
        status: 200,
        description: 'Document updated successfully',
        type: DocumentResponseDto,
    })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Document not found' })
    async updateDocument(
        @Param('id') id: string,
        @Body() updateDocumentDto: UpdateDocumentDto,
        @Request() req,
    ): Promise<DocumentResponseDto> {
        return this.documentsService.update(id, updateDocumentDto, req.user.id);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete document' })
    @ApiParam({ name: 'id', description: 'Document ID' })
    @ApiResponse({ status: 204, description: 'Document deleted successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Document not found' })
    async deleteDocument(
        @Param('id') id: string,
        @Request() req,
    ): Promise<void> {
        await this.documentsService.remove(id, req.user.id);
    }
}
