import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { StripeService, BillingPlan, UsageMetrics } from './stripe.service';

export interface PlanLimits {
    maxDocuments: number;
    maxTokensPerMonth: number;
    maxUsers: number;
    maxHistoryRetentionDays: number;
    slackIntegration: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
    customBranding: boolean;
    maxFileSizeMB: number;
    maxConcurrentUploads: number;
    maxThreadsPerProject: number;
    maxMessagesPerThread: number;
}

export interface PlanCheckResult {
    allowed: boolean;
    reason?: string;
    currentUsage?: Partial<UsageMetrics>;
    limits?: Partial<PlanLimits>;
    upgradeRequired?: boolean;
}

@Injectable()
export class PlanGatesService {
    private readonly logger = new Logger(PlanGatesService.name);

    constructor(private readonly stripeService: StripeService) { }

    /**
     * Get plan limits for a specific plan
     */
    getPlanLimits(planId: string): PlanLimits {
        const plan = this.stripeService.getPlan(planId);
        if (!plan) {
            throw new Error(`Plan ${planId} not found`);
        }

        // Map plan features to limits
        const limits: PlanLimits = {
            maxDocuments: plan.features.maxDocuments,
            maxTokensPerMonth: plan.features.maxTokensPerMonth,
            maxUsers: plan.features.maxUsers,
            maxHistoryRetentionDays: this.getHistoryRetentionDays(planId),
            slackIntegration: plan.features.slackIntegration,
            apiAccess: plan.features.apiAccess,
            prioritySupport: plan.features.prioritySupport,
            customBranding: plan.features.customBranding,
            maxFileSizeMB: this.getMaxFileSize(planId),
            maxConcurrentUploads: this.getMaxConcurrentUploads(planId),
            maxThreadsPerProject: this.getMaxThreadsPerProject(planId),
            maxMessagesPerThread: this.getMaxMessagesPerThread(planId),
        };

        return limits;
    }

    /**
     * Check if document upload is allowed
     */
    async checkDocumentUpload(
        organizationId: string,
        planId: string,
        currentUsage: UsageMetrics,
        fileSizeMB: number
    ): Promise<PlanCheckResult> {
        const limits = this.getPlanLimits(planId);

        // Check document count limit
        if (limits.maxDocuments > 0 && currentUsage.documentsCount >= limits.maxDocuments) {
            return {
                allowed: false,
                reason: `Document limit exceeded. Current: ${currentUsage.documentsCount}, Limit: ${limits.maxDocuments}`,
                currentUsage,
                limits,
                upgradeRequired: true,
            };
        }

        // Check file size limit
        if (fileSizeMB > limits.maxFileSizeMB) {
            return {
                allowed: false,
                reason: `File size too large. Size: ${fileSizeMB}MB, Limit: ${limits.maxFileSizeMB}MB`,
                limits,
                upgradeRequired: true,
            };
        }

        return { allowed: true };
    }

    /**
     * Check if user creation is allowed
     */
    async checkUserCreation(
        organizationId: string,
        planId: string,
        currentUsage: UsageMetrics
    ): Promise<PlanCheckResult> {
        const limits = this.getPlanLimits(planId);

        if (limits.maxUsers > 0 && currentUsage.usersCount >= limits.maxUsers) {
            return {
                allowed: false,
                reason: `User limit exceeded. Current: ${currentUsage.usersCount}, Limit: ${limits.maxUsers}`,
                currentUsage,
                limits,
                upgradeRequired: true,
            };
        }

        return { allowed: true };
    }

    /**
     * Check if token usage is allowed
     */
    async checkTokenUsage(
        organizationId: string,
        planId: string,
        currentUsage: UsageMetrics,
        requestedTokens: number
    ): Promise<PlanCheckResult> {
        const limits = this.getPlanLimits(planId);

        if (limits.maxTokensPerMonth > 0) {
            const projectedUsage = currentUsage.tokensUsed + requestedTokens;
            if (projectedUsage > limits.maxTokensPerMonth) {
                return {
                    allowed: false,
                    reason: `Token limit would be exceeded. Current: ${currentUsage.tokensUsed}, Requested: ${requestedTokens}, Limit: ${limits.maxTokensPerMonth}`,
                    currentUsage,
                    limits,
                    upgradeRequired: true,
                };
            }
        }

        return { allowed: true };
    }

    /**
     * Check if Slack integration is allowed
     */
    async checkSlackIntegration(
        organizationId: string,
        planId: string
    ): Promise<PlanCheckResult> {
        const limits = this.getPlanLimits(planId);

        if (!limits.slackIntegration) {
            return {
                allowed: false,
                reason: 'Slack integration not available on current plan',
                limits,
                upgradeRequired: true,
            };
        }

        return { allowed: true };
    }

    /**
     * Check if API access is allowed
     */
    async checkApiAccess(
        organizationId: string,
        planId: string
    ): Promise<PlanCheckResult> {
        const limits = this.getPlanLimits(planId);

        if (!limits.apiAccess) {
            return {
                allowed: false,
                reason: 'API access not available on current plan',
                limits,
                upgradeRequired: true,
            };
        }

        return { allowed: true };
    }

    /**
     * Check if thread creation is allowed
     */
    async checkThreadCreation(
        organizationId: string,
        planId: string,
        projectId: string,
        currentThreadCount: number
    ): Promise<PlanCheckResult> {
        const limits = this.getPlanLimits(planId);

        if (limits.maxThreadsPerProject > 0 && currentThreadCount >= limits.maxThreadsPerProject) {
            return {
                allowed: false,
                reason: `Thread limit exceeded for project. Current: ${currentThreadCount}, Limit: ${limits.maxThreadsPerProject}`,
                limits,
                upgradeRequired: true,
            };
        }

        return { allowed: true };
    }

    /**
     * Check if message creation is allowed
     */
    async checkMessageCreation(
        organizationId: string,
        planId: string,
        threadId: string,
        currentMessageCount: number
    ): Promise<PlanCheckResult> {
        const limits = this.getPlanLimits(planId);

        if (limits.maxMessagesPerThread > 0 && currentMessageCount >= limits.maxMessagesPerThread) {
            return {
                allowed: false,
                reason: `Message limit exceeded for thread. Current: ${currentMessageCount}, Limit: ${limits.maxMessagesPerThread}`,
                limits,
                upgradeRequired: true,
            };
        }

        return { allowed: true };
    }

    /**
     * Check if concurrent uploads are allowed
     */
    async checkConcurrentUploads(
        organizationId: string,
        planId: string,
        currentUploads: number
    ): Promise<PlanCheckResult> {
        const limits = this.getPlanLimits(planId);

        if (currentUploads >= limits.maxConcurrentUploads) {
            return {
                allowed: false,
                reason: `Concurrent upload limit exceeded. Current: ${currentUploads}, Limit: ${limits.maxConcurrentUploads}`,
                limits,
                upgradeRequired: true,
            };
        }

        return { allowed: true };
    }

    /**
     * Check if data retention is within limits
     */
    async checkDataRetention(
        organizationId: string,
        planId: string,
        documentAgeDays: number
    ): Promise<PlanCheckResult> {
        const limits = this.getPlanLimits(planId);

        if (documentAgeDays > limits.maxHistoryRetentionDays) {
            return {
                allowed: false,
                reason: `Document exceeds retention period. Age: ${documentAgeDays} days, Limit: ${limits.maxHistoryRetentionDays} days`,
                limits,
                upgradeRequired: true,
            };
        }

        return { allowed: true };
    }

    /**
     * Check if custom branding is allowed
     */
    async checkCustomBranding(
        organizationId: string,
        planId: string
    ): Promise<PlanCheckResult> {
        const limits = this.getPlanLimits(planId);

        if (!limits.customBranding) {
            return {
                allowed: false,
                reason: 'Custom branding not available on current plan',
                limits,
                upgradeRequired: true,
            };
        }

        return { allowed: true };
    }

    /**
     * Check if priority support is available
     */
    async checkPrioritySupport(
        organizationId: string,
        planId: string
    ): Promise<PlanCheckResult> {
        const limits = this.getPlanLimits(planId);

        if (!limits.prioritySupport) {
            return {
                allowed: false,
                reason: 'Priority support not available on current plan',
                limits,
                upgradeRequired: true,
            };
        }

        return { allowed: true };
    }

    /**
     * Enforce plan limits with exception throwing
     */
    async enforceDocumentUpload(
        organizationId: string,
        planId: string,
        currentUsage: UsageMetrics,
        fileSizeMB: number
    ): Promise<void> {
        const result = await this.checkDocumentUpload(organizationId, planId, currentUsage, fileSizeMB);
        if (!result.allowed) {
            throw new ForbiddenException(result.reason);
        }
    }

    async enforceUserCreation(
        organizationId: string,
        planId: string,
        currentUsage: UsageMetrics
    ): Promise<void> {
        const result = await this.checkUserCreation(organizationId, planId, currentUsage);
        if (!result.allowed) {
            throw new ForbiddenException(result.reason);
        }
    }

    async enforceTokenUsage(
        organizationId: string,
        planId: string,
        currentUsage: UsageMetrics,
        requestedTokens: number
    ): Promise<void> {
        const result = await this.checkTokenUsage(organizationId, planId, currentUsage, requestedTokens);
        if (!result.allowed) {
            throw new ForbiddenException(result.reason);
        }
    }

    async enforceSlackIntegration(
        organizationId: string,
        planId: string
    ): Promise<void> {
        const result = await this.checkSlackIntegration(organizationId, planId);
        if (!result.allowed) {
            throw new ForbiddenException(result.reason);
        }
    }

    async enforceApiAccess(
        organizationId: string,
        planId: string
    ): Promise<void> {
        const result = await this.checkApiAccess(organizationId, planId);
        if (!result.allowed) {
            throw new ForbiddenException(result.reason);
        }
    }

    async enforceThreadCreation(
        organizationId: string,
        planId: string,
        projectId: string,
        currentThreadCount: number
    ): Promise<void> {
        const result = await this.checkThreadCreation(organizationId, planId, projectId, currentThreadCount);
        if (!result.allowed) {
            throw new ForbiddenException(result.reason);
        }
    }

    async enforceMessageCreation(
        organizationId: string,
        planId: string,
        threadId: string,
        currentMessageCount: number
    ): Promise<void> {
        const result = await this.checkMessageCreation(organizationId, planId, threadId, currentMessageCount);
        if (!result.allowed) {
            throw new ForbiddenException(result.reason);
        }
    }

    async enforceConcurrentUploads(
        organizationId: string,
        planId: string,
        currentUploads: number
    ): Promise<void> {
        const result = await this.checkConcurrentUploads(organizationId, planId, currentUploads);
        if (!result.allowed) {
            throw new ForbiddenException(result.reason);
        }
    }

    async enforceDataRetention(
        organizationId: string,
        planId: string,
        documentAgeDays: number
    ): Promise<void> {
        const result = await this.checkDataRetention(organizationId, planId, documentAgeDays);
        if (!result.allowed) {
            throw new ForbiddenException(result.reason);
        }
    }

    async enforceCustomBranding(
        organizationId: string,
        planId: string
    ): Promise<void> {
        const result = await this.checkCustomBranding(organizationId, planId);
        if (!result.allowed) {
            throw new ForbiddenException(result.reason);
        }
    }

    async enforcePrioritySupport(
        organizationId: string,
        planId: string
    ): Promise<void> {
        const result = await this.checkPrioritySupport(organizationId, planId);
        if (!result.allowed) {
            throw new ForbiddenException(result.reason);
        }
    }

    /**
     * Get upgrade recommendations based on current usage
     */
    async getUpgradeRecommendations(
        organizationId: string,
        planId: string,
        currentUsage: UsageMetrics
    ): Promise<{
        recommendedPlan?: string;
        reasons: string[];
        currentPlanLimits: PlanLimits;
        usagePercentage: Record<string, number>;
    }> {
        const currentLimits = this.getPlanLimits(planId);
        const plans = this.stripeService.getPlans();
        const reasons: string[] = [];
        const usagePercentage: Record<string, number> = {};

        // Calculate usage percentages
        if (currentLimits.maxDocuments > 0) {
            usagePercentage.documents = (currentUsage.documentsCount / currentLimits.maxDocuments) * 100;
            if (usagePercentage.documents > 80) {
                reasons.push(`Document usage at ${usagePercentage.documents.toFixed(1)}% of limit`);
            }
        }

        if (currentLimits.maxTokensPerMonth > 0) {
            usagePercentage.tokens = (currentUsage.tokensUsed / currentLimits.maxTokensPerMonth) * 100;
            if (usagePercentage.tokens > 80) {
                reasons.push(`Token usage at ${usagePercentage.tokens.toFixed(1)}% of limit`);
            }
        }

        if (currentLimits.maxUsers > 0) {
            usagePercentage.users = (currentUsage.usersCount / currentLimits.maxUsers) * 100;
            if (usagePercentage.users > 80) {
                reasons.push(`User count at ${usagePercentage.users.toFixed(1)}% of limit`);
            }
        }

        // Find recommended plan
        let recommendedPlan: string | undefined;
        for (const plan of plans) {
            if (plan.id === planId) continue;

            const planLimits = this.getPlanLimits(plan.id);
            let suitable = true;

            if (currentLimits.maxDocuments > 0 && currentUsage.documentsCount > planLimits.maxDocuments) {
                suitable = false;
            }
            if (currentLimits.maxTokensPerMonth > 0 && currentUsage.tokensUsed > planLimits.maxTokensPerMonth) {
                suitable = false;
            }
            if (currentLimits.maxUsers > 0 && currentUsage.usersCount > planLimits.maxUsers) {
                suitable = false;
            }

            if (suitable) {
                recommendedPlan = plan.id;
                break;
            }
        }

        return {
            recommendedPlan,
            reasons,
            currentPlanLimits: currentLimits,
            usagePercentage,
        };
    }

    // Helper methods for plan-specific limits
    private getHistoryRetentionDays(planId: string): number {
        switch (planId) {
            case 'free':
                return 30;
            case 'starter':
                return 90;
            case 'professional':
                return 365;
            case 'enterprise':
                return -1; // Unlimited
            default:
                return 30;
        }
    }

    private getMaxFileSize(planId: string): number {
        switch (planId) {
            case 'free':
                return 10;
            case 'starter':
                return 50;
            case 'professional':
                return 200;
            case 'enterprise':
                return 1000;
            default:
                return 10;
        }
    }

    private getMaxConcurrentUploads(planId: string): number {
        switch (planId) {
            case 'free':
                return 1;
            case 'starter':
                return 3;
            case 'professional':
                return 10;
            case 'enterprise':
                return 50;
            default:
                return 1;
        }
    }

    private getMaxThreadsPerProject(planId: string): number {
        switch (planId) {
            case 'free':
                return 10;
            case 'starter':
                return 100;
            case 'professional':
                return 1000;
            case 'enterprise':
                return -1; // Unlimited
            default:
                return 10;
        }
    }

    private getMaxMessagesPerThread(planId: string): number {
        switch (planId) {
            case 'free':
                return 50;
            case 'starter':
                return 200;
            case 'professional':
                return 1000;
            case 'enterprise':
                return -1; // Unlimited
            default:
                return 50;
        }
    }
}
