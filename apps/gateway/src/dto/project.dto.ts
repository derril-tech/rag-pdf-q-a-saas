// Created automatically by Cursor AI (2025-01-27)

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, MinLength, MaxLength } from 'class-validator';

export class CreateProjectDto {
    @ApiProperty({
        description: 'Project name',
        example: 'Product Documentation',
        minLength: 1,
        maxLength: 255,
    })
    @IsString()
    @MinLength(1)
    @MaxLength(255)
    name: string;

    @ApiPropertyOptional({
        description: 'Project description',
        example: 'All product documentation and user guides',
        maxLength: 1000,
    })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    description?: string;

    @ApiPropertyOptional({
        description: 'Project settings',
        example: { enableOCR: true, chunkSize: 1000 },
    })
    @IsOptional()
    @IsObject()
    settings?: Record<string, any>;
}

export class UpdateProjectDto {
    @ApiPropertyOptional({
        description: 'Project name',
        example: 'Product Documentation v2',
        minLength: 1,
        maxLength: 255,
    })
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(255)
    name?: string;

    @ApiPropertyOptional({
        description: 'Project description',
        example: 'Updated product documentation and user guides',
        maxLength: 1000,
    })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    description?: string;

    @ApiPropertyOptional({
        description: 'Project settings',
        example: { enableOCR: true, chunkSize: 1000 },
    })
    @IsOptional()
    @IsObject()
    settings?: Record<string, any>;
}

export class ProjectResponseDto {
    @ApiProperty({
        description: 'Project ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    id: string;

    @ApiProperty({
        description: 'Organization ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    orgId: string;

    @ApiProperty({
        description: 'Project name',
        example: 'Product Documentation',
    })
    name: string;

    @ApiPropertyOptional({
        description: 'Project description',
        example: 'All product documentation and user guides',
    })
    description?: string;

    @ApiProperty({
        description: 'Project settings',
        example: { enableOCR: true, chunkSize: 1000 },
    })
    settings: Record<string, any>;

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
