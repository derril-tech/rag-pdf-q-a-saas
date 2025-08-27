// Created automatically by Cursor AI (2025-01-27)

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsNumber, IsUUID, MinLength, Min, Max } from 'class-validator';

export class QARequestDto {
    @ApiProperty({
        description: 'Query text',
        example: 'What are the main features of the product?',
        minLength: 1,
    })
    @IsString()
    @MinLength(1)
    query: string;

    @ApiPropertyOptional({
        description: 'Thread ID for conversation context',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsOptional()
    @IsUUID()
    threadId?: string;

    @ApiPropertyOptional({
        description: 'Project ID to search within',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsOptional()
    @IsUUID()
    projectId?: string;

    @ApiPropertyOptional({
        description: 'Specific document IDs to search within',
        example: ['123e4567-e89b-12d3-a456-426614174000', '456e7890-e89b-12d3-a456-426614174000'],
    })
    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    documentIds?: string[];

    @ApiPropertyOptional({
        description: 'Maximum number of results to return',
        example: 10,
        minimum: 1,
        maximum: 20,
        default: 10,
    })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(20)
    maxResults?: number;

    @ApiPropertyOptional({
        description: 'Temperature for LLM response generation',
        example: 0.7,
        minimum: 0,
        maximum: 2,
        default: 0.7,
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(2)
    temperature?: number;
}

export class CitationDto {
    @ApiProperty({
        description: 'Document ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsUUID()
    documentId: string;

    @ApiProperty({
        description: 'Page number',
        example: 5,
        minimum: 0,
    })
    @IsNumber()
    @Min(0)
    pageNumber: number;

    @ApiProperty({
        description: 'Chunk index within the page',
        example: 2,
        minimum: 0,
    })
    @IsNumber()
    @Min(0)
    chunkIndex: number;

    @ApiProperty({
        description: 'Cited text content',
        example: 'The main features include real-time collaboration, version control, and automated workflows.',
    })
    @IsString()
    content: string;

    @ApiProperty({
        description: 'Relevance score (0-1)',
        example: 0.95,
        minimum: 0,
        maximum: 1,
    })
    @IsNumber()
    @Min(0)
    @Max(1)
    score: number;
}

export class QAResponseDto {
    @ApiProperty({
        description: 'Generated answer',
        example: 'Based on the documentation, the main features of the product include real-time collaboration, version control, and automated workflows. These features enable teams to work together efficiently while maintaining data integrity.',
    })
    @IsString()
    answer: string;

    @ApiProperty({
        description: 'Citations from source documents',
        type: [CitationDto],
    })
    @IsArray()
    citations: CitationDto[];

    @ApiPropertyOptional({
        description: 'Thread ID if created',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsOptional()
    @IsUUID()
    threadId?: string;

    @ApiPropertyOptional({
        description: 'Message ID if saved to thread',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsOptional()
    @IsUUID()
    messageId?: string;

    @ApiProperty({
        description: 'Response metadata',
        example: { tokensUsed: 150, latency: 1200, model: 'gpt-4' },
    })
    metadata: Record<string, any>;
}

export class CreateThreadDto {
    @ApiPropertyOptional({
        description: 'Thread title',
        example: 'Product Features Discussion',
    })
    @IsOptional()
    @IsString()
    title?: string;
}

export class ThreadResponseDto {
    @ApiProperty({
        description: 'Thread ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    id: string;

    @ApiProperty({
        description: 'Project ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    projectId: string;

    @ApiPropertyOptional({
        description: 'Thread title',
        example: 'Product Features Discussion',
    })
    title?: string;

    @ApiPropertyOptional({
        description: 'Created by user ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    createdBy?: string;

    @ApiProperty({
        description: 'Creation timestamp',
        example: '2023-12-01T10:00:00Z',
    })
    createdAt: string;

    @ApiProperty({
        description: 'Last update timestamp',
        example: '2023-12-01T10:00:00Z',
    })
    updatedAt: string;
}

export class CreateMessageDto {
    @ApiProperty({
        description: 'Message content',
        example: 'What are the main features of the product?',
        minLength: 1,
    })
    @IsString()
    @MinLength(1)
    content: string;

    @ApiPropertyOptional({
        description: 'Citations from source documents',
        type: [CitationDto],
    })
    @IsOptional()
    @IsArray()
    citations?: CitationDto[];

    @ApiPropertyOptional({
        description: 'Message metadata',
        example: { tokensUsed: 150, model: 'gpt-4' },
    })
    @IsOptional()
    metadata?: Record<string, any>;
}

export class MessageResponseDto {
    @ApiProperty({
        description: 'Message ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    id: string;

    @ApiProperty({
        description: 'Thread ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    threadId: string;

    @ApiProperty({
        description: 'Message role',
        example: 'user',
        enum: ['user', 'assistant', 'system'],
    })
    role: 'user' | 'assistant' | 'system';

    @ApiProperty({
        description: 'Message content',
        example: 'What are the main features of the product?',
    })
    content: string;

    @ApiProperty({
        description: 'Citations from source documents',
        type: [CitationDto],
    })
    citations: CitationDto[];

    @ApiProperty({
        description: 'Message metadata',
        example: { tokensUsed: 150, model: 'gpt-4' },
    })
    metadata: Record<string, any>;

    @ApiProperty({
        description: 'Creation timestamp',
        example: '2023-12-01T10:00:00Z',
    })
    createdAt: string;
}
