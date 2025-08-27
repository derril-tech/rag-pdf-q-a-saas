// Created automatically by Cursor AI (2025-01-27)

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsObject, MinLength, MaxLength, Matches } from 'class-validator';
import { PlanTier } from '@rag-pdf-qa/contracts';

export class CreateOrganizationDto {
    @ApiProperty({
        description: 'Organization name',
        example: 'Acme Corp',
        minLength: 1,
        maxLength: 255,
    })
    @IsString()
    @MinLength(1)
    @MaxLength(255)
    name: string;

    @ApiProperty({
        description: 'Organization slug (URL-friendly identifier)',
        example: 'acme-corp',
        minLength: 1,
        maxLength: 100,
        pattern: '^[a-z0-9-]+$',
    })
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    @Matches(/^[a-z0-9-]+$/, {
        message: 'Slug must contain only lowercase letters, numbers, and hyphens',
    })
    slug: string;
}

export class UpdateOrganizationDto {
    @ApiPropertyOptional({
        description: 'Organization name',
        example: 'Acme Corporation',
        minLength: 1,
        maxLength: 255,
    })
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(255)
    name?: string;

    @ApiPropertyOptional({
        description: 'Organization settings',
        example: { theme: 'dark', notifications: true },
    })
    @IsOptional()
    @IsObject()
    settings?: Record<string, any>;
}

export class OrganizationResponseDto {
    @ApiProperty({
        description: 'Organization ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    id: string;

    @ApiProperty({
        description: 'Organization name',
        example: 'Acme Corp',
    })
    name: string;

    @ApiProperty({
        description: 'Organization slug',
        example: 'acme-corp',
    })
    slug: string;

    @ApiProperty({
        description: 'Plan tier',
        enum: PlanTier,
        example: PlanTier.FREE,
    })
    @IsEnum(PlanTier)
    planTier: PlanTier;

    @ApiProperty({
        description: 'Organization settings',
        example: { theme: 'dark', notifications: true },
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
