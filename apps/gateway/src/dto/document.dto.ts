// Created automatically by Cursor AI (2025-01-27)

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsNumber, MinLength, MaxLength, Min, IsEnum } from 'class-validator';
import { DocumentStatus } from '@rag-pdf-qa/contracts';

export class CreateDocumentDto {
    @ApiProperty({
        description: 'Document name',
        example: 'User Manual.pdf',
        minLength: 1,
        maxLength: 255,
    })
    @IsString()
    @MinLength(1)
    @MaxLength(255)
    name: string;

    @ApiProperty({
        description: 'File path in storage',
        example: 'documents/123e4567-e89b-12d3-a456-426614174000/user-manual.pdf',
    })
    @IsString()
    filePath: string;

    @ApiProperty({
        description: 'File size in bytes',
        example: 1048576,
        minimum: 1,
    })
    @IsNumber()
    @Min(1)
    fileSize: number;

    @ApiProperty({
        description: 'MIME type',
        example: 'application/pdf',
        minLength: 1,
        maxLength: 100,
    })
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    mimeType: string;

    @ApiPropertyOptional({
        description: 'Document metadata',
        example: { author: 'John Doe', version: '1.0' },
    })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}

export class UpdateDocumentDto {
    @ApiPropertyOptional({
        description: 'Document name',
        example: 'Updated User Manual.pdf',
        minLength: 1,
        maxLength: 255,
    })
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(255)
    name?: string;

    @ApiPropertyOptional({
        description: 'Document metadata',
        example: { author: 'Jane Doe', version: '2.0' },
    })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}

export class DocumentResponseDto {
    @ApiProperty({
        description: 'Document ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    id: string;

    @ApiProperty({
        description: 'Project ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    projectId: string;

    @ApiProperty({
        description: 'Document name',
        example: 'User Manual.pdf',
    })
    name: string;

    @ApiProperty({
        description: 'File path in storage',
        example: 'documents/123e4567-e89b-12d3-a456-426614174000/user-manual.pdf',
    })
    filePath: string;

    @ApiProperty({
        description: 'File size in bytes',
        example: 1048576,
    })
    fileSize: number;

    @ApiProperty({
        description: 'MIME type',
        example: 'application/pdf',
    })
    mimeType: string;

    @ApiPropertyOptional({
        description: 'Number of pages',
        example: 50,
        minimum: 1,
    })
    pageCount?: number;

    @ApiProperty({
        description: 'Document status',
        enum: DocumentStatus,
        example: DocumentStatus.UPLOADED,
    })
    @IsEnum(DocumentStatus)
    status: DocumentStatus;

    @ApiProperty({
        description: 'Document metadata',
        example: { author: 'John Doe', version: '1.0' },
    })
    metadata: Record<string, any>;

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

export class UploadUrlRequestDto {
    @ApiProperty({
        description: 'File name',
        example: 'user-manual.pdf',
    })
    @IsString()
    @MinLength(1)
    @MaxLength(255)
    fileName: string;

    @ApiProperty({
        description: 'File size in bytes',
        example: 1048576,
        minimum: 1,
    })
    @IsNumber()
    @Min(1)
    fileSize: number;

    @ApiProperty({
        description: 'MIME type',
        example: 'application/pdf',
    })
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    mimeType: string;
}

export class UploadUrlResponseDto {
    @ApiProperty({
        description: 'Presigned upload URL',
        example: 'https://s3.amazonaws.com/bucket/documents/123e4567-e89b-12d3-a456-426614174000/user-manual.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&...',
    })
    uploadUrl: string;

    @ApiProperty({
        description: 'Document ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    documentId: string;

    @ApiProperty({
        description: 'Expiration timestamp',
        example: '2023-12-01T11:00:00Z',
    })
    expiresAt: string;
}
