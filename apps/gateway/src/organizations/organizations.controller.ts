// Created automatically by Cursor AI (2025-01-27)

import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
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
} from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import {
    CreateOrganizationDto,
    UpdateOrganizationDto,
    OrganizationResponseDto,
} from '../dto/organization.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('organizations')
@Controller('organizations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrganizationsController {
    constructor(private readonly organizationsService: OrganizationsService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new organization' })
    @ApiResponse({
        status: 201,
        description: 'Organization created successfully',
        type: OrganizationResponseDto,
    })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 409, description: 'Organization slug already exists' })
    async createOrganization(
        @Body() createOrganizationDto: CreateOrganizationDto,
        @Request() req,
    ): Promise<OrganizationResponseDto> {
        return this.organizationsService.create(createOrganizationDto, req.user.id);
    }

    @Get()
    @ApiOperation({ summary: 'Get all organizations for the current user' })
    @ApiResponse({
        status: 200,
        description: 'List of organizations',
        type: [OrganizationResponseDto],
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getOrganizations(@Request() req): Promise<OrganizationResponseDto[]> {
        return this.organizationsService.findAllByUser(req.user.id);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get organization by ID' })
    @ApiParam({ name: 'id', description: 'Organization ID' })
    @ApiResponse({
        status: 200,
        description: 'Organization details',
        type: OrganizationResponseDto,
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Organization not found' })
    async getOrganization(
        @Param('id') id: string,
        @Request() req,
    ): Promise<OrganizationResponseDto> {
        return this.organizationsService.findOne(id, req.user.id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update organization' })
    @ApiParam({ name: 'id', description: 'Organization ID' })
    @ApiResponse({
        status: 200,
        description: 'Organization updated successfully',
        type: OrganizationResponseDto,
    })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Organization not found' })
    async updateOrganization(
        @Param('id') id: string,
        @Body() updateOrganizationDto: UpdateOrganizationDto,
        @Request() req,
    ): Promise<OrganizationResponseDto> {
        return this.organizationsService.update(id, updateOrganizationDto, req.user.id);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete organization' })
    @ApiParam({ name: 'id', description: 'Organization ID' })
    @ApiResponse({ status: 204, description: 'Organization deleted successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Organization not found' })
    async deleteOrganization(
        @Param('id') id: string,
        @Request() req,
    ): Promise<void> {
        await this.organizationsService.remove(id, req.user.id);
    }
}
