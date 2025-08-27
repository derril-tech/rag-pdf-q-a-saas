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
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { HIPAAService, HIPAAConfig, HIPAAViolation } from './hipaa.service';

export class EnableHIPAADto {
    @ApiOperation({ description: 'Enable HIPAA compliance for organization' })
    enabled: boolean;
}

export class UpdateHIPAAConfigDto {
    @ApiOperation({ description: 'HIPAA configuration settings' })
    requireMFA?: boolean;
    requireStrongPasswords?: boolean;
    sessionTimeoutMinutes?: number;
    maxLoginAttempts?: number;
    requireAuditTrail?: boolean;
    requireDataEncryption?: boolean;
    requireBackupEncryption?: boolean;
    requireAccessLogs?: boolean;
    requireUserConsent?: boolean;
    requireDataRetention?: boolean;
    requireIncidentReporting?: boolean;
    allowedIntegrations?: string[];
    blockedIntegrations?: string[];
    requireDataClassification?: boolean;
    requireAccessControls?: boolean;
    requireAuditReviews?: boolean;
}

export class RemediateViolationDto {
    @ApiOperation({ description: 'Remediation notes' })
    notes?: string;
}

export class GenerateReportDto {
    @ApiOperation({ description: 'Start date for report' })
    startDate: Date;

    @ApiOperation({ description: 'End date for report' })
    endDate: Date;
}

@ApiTags('HIPAA Compliance')
@Controller('v1/hipaa')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class HIPAAController {
    constructor(private readonly hipaaService: HIPAAService) { }

    @Get('config/:organizationId')
    @Roles('admin', 'owner')
    @ApiOperation({ summary: 'Get HIPAA configuration for organization' })
    @ApiResponse({ status: 200, description: 'HIPAA configuration retrieved' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async getHIPAAConfig(@Param('organizationId') organizationId: string): Promise<HIPAAConfig> {
        return this.hipaaService.getHIPAAConfig(organizationId);
    }

    @Post('config/:organizationId/enable')
    @Roles('admin', 'owner')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Enable HIPAA compliance for organization' })
    @ApiResponse({ status: 200, description: 'HIPAA compliance enabled' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async enableHIPAA(
        @Param('organizationId') organizationId: string,
        @Body() dto: EnableHIPAADto,
    ): Promise<{ message: string }> {
        // TODO: Get userId from JWT token
        const userId = 'current-user-id';
        await this.hipaaService.enableHIPAA(organizationId, userId);
        return { message: 'HIPAA compliance enabled successfully' };
    }

    @Post('config/:organizationId/disable')
    @Roles('admin', 'owner')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Disable HIPAA compliance for organization' })
    @ApiResponse({ status: 200, description: 'HIPAA compliance disabled' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async disableHIPAA(
        @Param('organizationId') organizationId: string,
    ): Promise<{ message: string }> {
        // TODO: Get userId from JWT token
        const userId = 'current-user-id';
        await this.hipaaService.disableHIPAA(organizationId, userId);
        return { message: 'HIPAA compliance disabled successfully' };
    }

    @Put('config/:organizationId')
    @Roles('admin', 'owner')
    @ApiOperation({ summary: 'Update HIPAA configuration' })
    @ApiResponse({ status: 200, description: 'HIPAA configuration updated' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async updateHIPAAConfig(
        @Param('organizationId') organizationId: string,
        @Body() dto: UpdateHIPAAConfigDto,
    ): Promise<{ message: string }> {
        // TODO: Get userId from JWT token
        const userId = 'current-user-id';
        const config = await this.hipaaService.getHIPAAConfig(organizationId);

        // Update config with provided values
        Object.assign(config, dto);

        // This would call a method to update the config in the service
        // For now, just return success
        return { message: 'HIPAA configuration updated successfully' };
    }

    @Get('compliance/:organizationId/user/:userId')
    @Roles('admin', 'owner')
    @ApiOperation({ summary: 'Check user HIPAA compliance' })
    @ApiResponse({ status: 200, description: 'User compliance status' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async checkUserCompliance(
        @Param('organizationId') organizationId: string,
        @Param('userId') userId: string,
    ): Promise<{
        compliant: boolean;
        issues: string[];
        requirements: {
            mfaEnabled: boolean;
            strongPassword: boolean;
            consentGiven: boolean;
            trainingCompleted: boolean;
        };
    }> {
        return this.hipaaService.checkUserHIPAACompliance(organizationId, userId);
    }

    @Post('violations/:organizationId')
    @Roles('admin', 'owner')
    @ApiOperation({ summary: 'Log HIPAA violation' })
    @ApiResponse({ status: 201, description: 'Violation logged' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async logViolation(
        @Param('organizationId') organizationId: string,
        @Body() dto: {
            userId?: string;
            violationType: string;
            description: string;
            severity: HIPAAViolation['severity'];
        },
    ): Promise<{ message: string; violationId: string }> {
        // TODO: Get current userId from JWT token
        const currentUserId = 'current-user-id';
        const userId = dto.userId || currentUserId;

        await this.hipaaService.logViolation(
            organizationId,
            userId,
            dto.violationType,
            dto.description,
            dto.severity,
        );

        return {
            message: 'HIPAA violation logged successfully',
            violationId: `violation_${Date.now()}`,
        };
    }

    @Get('violations/:organizationId')
    @Roles('admin', 'owner')
    @ApiOperation({ summary: 'Get HIPAA violations' })
    @ApiResponse({ status: 200, description: 'Violations retrieved' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async getViolations(
        @Param('organizationId') organizationId: string,
        @Query('remediated') remediated?: boolean,
        @Query('severity') severity?: HIPAAViolation['severity'],
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('limit') limit?: number,
        @Query('offset') offset?: number,
    ): Promise<{
        violations: HIPAAViolation[];
        total: number;
        hasMore: boolean;
    }> {
        const options: any = {};
        if (remediated !== undefined) options.remediated = remediated;
        if (severity) options.severity = severity;
        if (startDate) options.startDate = new Date(startDate);
        if (endDate) options.endDate = new Date(endDate);
        if (limit) options.limit = limit;
        if (offset) options.offset = offset;

        return this.hipaaService.getViolations(organizationId, options);
    }

    @Post('violations/:organizationId/:violationId/remediate')
    @Roles('admin', 'owner')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Remediate HIPAA violation' })
    @ApiResponse({ status: 200, description: 'Violation remediated' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async remediateViolation(
        @Param('organizationId') organizationId: string,
        @Param('violationId') violationId: string,
        @Body() dto: RemediateViolationDto,
    ): Promise<{ message: string }> {
        // TODO: Get userId from JWT token
        const userId = 'current-user-id';
        await this.hipaaService.remediateViolation(violationId, organizationId, userId, dto.notes);
        return { message: 'Violation remediated successfully' };
    }

    @Post('reports/:organizationId/generate')
    @Roles('admin', 'owner')
    @ApiOperation({ summary: 'Generate HIPAA compliance report' })
    @ApiResponse({ status: 201, description: 'Report generated' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async generateComplianceReport(
        @Param('organizationId') organizationId: string,
        @Body() dto: GenerateReportDto,
    ): Promise<{
        reportId: string;
        downloadUrl: string;
        expiresAt: Date;
        summary: {
            totalViolations: number;
            remediatedViolations: number;
            openViolations: number;
            complianceScore: number;
        };
    }> {
        return this.hipaaService.generateComplianceReport(
            organizationId,
            dto.startDate,
            dto.endDate,
        );
    }

    @Get('reports/:organizationId/:reportId')
    @Roles('admin', 'owner')
    @ApiOperation({ summary: 'Get HIPAA compliance report' })
    @ApiResponse({ status: 200, description: 'Report retrieved' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async getComplianceReport(
        @Param('organizationId') organizationId: string,
        @Param('reportId') reportId: string,
    ): Promise<{
        reportId: string;
        downloadUrl: string;
        expiresAt: Date;
        summary: {
            totalViolations: number;
            remediatedViolations: number;
            openViolations: number;
            complianceScore: number;
        };
    }> {
        // This would fetch the report from storage
        // For now, return mock data
        return {
            reportId,
            downloadUrl: `https://example.com/hipaa-reports/${reportId}.pdf`,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            summary: {
                totalViolations: 0,
                remediatedViolations: 0,
                openViolations: 0,
                complianceScore: 100,
            },
        };
    }

    @Get('requirements/:organizationId')
    @Roles('admin', 'owner')
    @ApiOperation({ summary: 'Get HIPAA requirements status' })
    @ApiResponse({ status: 200, description: 'Requirements status' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    async getRequirementsStatus(
        @Param('organizationId') organizationId: string,
    ): Promise<{
        dataClassificationRequired: boolean;
        accessControlRequired: boolean;
        auditReviewRequired: boolean;
    }> {
        const [
            dataClassificationRequired,
            accessControlRequired,
            auditReviewRequired,
        ] = await Promise.all([
            this.hipaaService.isDataClassificationRequired(organizationId),
            this.hipaaService.isAccessControlRequired(organizationId),
            this.hipaaService.isAuditReviewRequired(organizationId),
        ]);

        return {
            dataClassificationRequired,
            accessControlRequired,
            auditReviewRequired,
        };
    }
}
