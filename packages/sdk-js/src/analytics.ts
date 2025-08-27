import { RAGClient } from './client';
import {
    AnalyticsData,
    UsageStats,
    CostBreakdown,
    TopDocument,
    TopProject,
    HourlyUsage
} from './types';

export class AnalyticsManager {
    constructor(private client: RAGClient) { }

    // Get analytics overview
    async getAnalytics(params: {
        projectId?: string;
        dateFrom?: string;
        dateTo?: string;
        granularity?: 'hour' | 'day' | 'week' | 'month';
    } = {}): Promise<AnalyticsData> {
        const searchParams = new URLSearchParams();
        if (params.projectId) searchParams.append('projectId', params.projectId);
        if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
        if (params.dateTo) searchParams.append('dateTo', params.dateTo);
        if (params.granularity) searchParams.append('granularity', params.granularity);

        const query = searchParams.toString();
        const endpoint = query ? `/analytics?${query}` : '/analytics';

        return this.client.request(endpoint);
    }

    // Get usage statistics
    async getUsageStats(params: {
        projectId?: string;
        dateFrom?: string;
        dateTo?: string;
    } = {}): Promise<UsageStats> {
        const searchParams = new URLSearchParams();
        if (params.projectId) searchParams.append('projectId', params.projectId);
        if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
        if (params.dateTo) searchParams.append('dateTo', params.dateTo);

        const query = searchParams.toString();
        const endpoint = query ? `/analytics/usage?${query}` : '/analytics/usage';

        return this.client.request(endpoint);
    }

    // Get cost breakdown
    async getCostBreakdown(params: {
        projectId?: string;
        dateFrom?: string;
        dateTo?: string;
    } = {}): Promise<CostBreakdown> {
        const searchParams = new URLSearchParams();
        if (params.projectId) searchParams.append('projectId', params.projectId);
        if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
        if (params.dateTo) searchParams.append('dateTo', params.dateTo);

        const query = searchParams.toString();
        const endpoint = query ? `/analytics/costs?${query}` : '/analytics/costs';

        return this.client.request(endpoint);
    }

    // Get top documents
    async getTopDocuments(params: {
        projectId?: string;
        dateFrom?: string;
        dateTo?: string;
        limit?: number;
        metric?: 'queries' | 'citations' | 'tokens';
    } = {}): Promise<{
        documents: TopDocument[];
        total: number;
    }> {
        const searchParams = new URLSearchParams();
        if (params.projectId) searchParams.append('projectId', params.projectId);
        if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
        if (params.dateTo) searchParams.append('dateTo', params.dateTo);
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.metric) searchParams.append('metric', params.metric);

        const query = searchParams.toString();
        const endpoint = query ? `/analytics/top-documents?${query}` : '/analytics/top-documents';

        return this.client.request(endpoint);
    }

    // Get top projects
    async getTopProjects(params: {
        dateFrom?: string;
        dateTo?: string;
        limit?: number;
        metric?: 'queries' | 'documents' | 'users' | 'cost';
    } = {}): Promise<{
        projects: TopProject[];
        total: number;
    }> {
        const searchParams = new URLSearchParams();
        if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
        if (params.dateTo) searchParams.append('dateTo', params.dateTo);
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.metric) searchParams.append('metric', params.metric);

        const query = searchParams.toString();
        const endpoint = query ? `/analytics/top-projects?${query}` : '/analytics/top-projects';

        return this.client.request(endpoint);
    }

    // Get hourly usage
    async getHourlyUsage(params: {
        projectId?: string;
        date?: string;
    } = {}): Promise<{
        usage: HourlyUsage[];
        total: number;
    }> {
        const searchParams = new URLSearchParams();
        if (params.projectId) searchParams.append('projectId', params.projectId);
        if (params.date) searchParams.append('date', params.date);

        const query = searchParams.toString();
        const endpoint = query ? `/analytics/hourly?${query}` : '/analytics/hourly';

        return this.client.request(endpoint);
    }

    // Get user activity
    async getUserActivity(params: {
        projectId?: string;
        dateFrom?: string;
        dateTo?: string;
        limit?: number;
    } = {}): Promise<{
        users: Array<{
            userId: string;
            email: string;
            name: string;
            queryCount: number;
            documentCount: number;
            lastActive: string;
        }>;
        total: number;
    }> {
        const searchParams = new URLSearchParams();
        if (params.projectId) searchParams.append('projectId', params.projectId);
        if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
        if (params.dateTo) searchParams.append('dateTo', params.dateTo);
        if (params.limit) searchParams.append('limit', params.limit.toString());

        const query = searchParams.toString();
        const endpoint = query ? `/analytics/user-activity?${query}` : '/analytics/user-activity';

        return this.client.request(endpoint);
    }

    // Get query performance metrics
    async getQueryPerformance(params: {
        projectId?: string;
        dateFrom?: string;
        dateTo?: string;
    } = {}): Promise<{
        averageResponseTime: number;
        p95ResponseTime: number;
        p99ResponseTime: number;
        totalQueries: number;
        successfulQueries: number;
        failedQueries: number;
        queriesByModel: Array<{
            model: string;
            count: number;
            averageTokens: number;
            averageCost: number;
        }>;
    }> {
        const searchParams = new URLSearchParams();
        if (params.projectId) searchParams.append('projectId', params.projectId);
        if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
        if (params.dateTo) searchParams.append('dateTo', params.dateTo);

        const query = searchParams.toString();
        const endpoint = query ? `/analytics/query-performance?${query}` : '/analytics/query-performance';

        return this.client.request(endpoint);
    }

    // Get document processing metrics
    async getDocumentProcessingMetrics(params: {
        projectId?: string;
        dateFrom?: string;
        dateTo?: string;
    } = {}): Promise<{
        totalUploads: number;
        successfulUploads: number;
        failedUploads: number;
        averageProcessingTime: number;
        uploadsByType: Array<{
            type: string;
            count: number;
            averageSize: number;
        }>;
        processingErrors: Array<{
            error: string;
            count: number;
        }>;
    }> {
        const searchParams = new URLSearchParams();
        if (params.projectId) searchParams.append('projectId', params.projectId);
        if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
        if (params.dateTo) searchParams.append('dateTo', params.dateTo);

        const query = searchParams.toString();
        const endpoint = query ? `/analytics/document-processing?${query}` : '/analytics/document-processing';

        return this.client.request(endpoint);
    }

    // Get real-time metrics
    async getRealTimeMetrics(): Promise<{
        activeUsers: number;
        queriesPerMinute: number;
        documentsProcessing: number;
        systemHealth: {
            status: 'healthy' | 'degraded' | 'down';
            responseTime: number;
            errorRate: number;
        };
    }> {
        return this.client.request('/analytics/realtime');
    }

    // Export analytics data
    async exportAnalytics(
        format: 'csv' | 'json' | 'xlsx' = 'csv',
        params: {
            projectId?: string;
            dateFrom?: string;
            dateTo?: string;
            metrics?: string[];
        } = {}
    ): Promise<{
        downloadUrl: string;
        expiresAt: string;
        fileSize?: number;
    }> {
        return this.client.request('/analytics/export', {
            method: 'POST',
            body: JSON.stringify({
                format,
                projectId: params.projectId,
                dateFrom: params.dateFrom,
                dateTo: params.dateTo,
                metrics: params.metrics
            })
        });
    }

    // Get custom date range analytics
    async getCustomDateRangeAnalytics(
        dateRanges: Array<{
            name: string;
            dateFrom: string;
            dateTo: string;
        }>,
        params: {
            projectId?: string;
            metrics?: string[];
        } = {}
    ): Promise<{
        ranges: Array<{
            name: string;
            data: AnalyticsData;
        }>;
    }> {
        return this.client.request('/analytics/custom-ranges', {
            method: 'POST',
            body: JSON.stringify({
                dateRanges,
                projectId: params.projectId,
                metrics: params.metrics
            })
        });
    }

    // Get comparative analytics
    async getComparativeAnalytics(params: {
        projectId?: string;
        period1: {
            dateFrom: string;
            dateTo: string;
        };
        period2: {
            dateFrom: string;
            dateTo: string;
        };
    }): Promise<{
        period1: AnalyticsData;
        period2: AnalyticsData;
        changes: {
            queries: number;
            documents: number;
            cost: number;
            users: number;
        };
    }> {
        return this.client.request('/analytics/comparative', {
            method: 'POST',
            body: JSON.stringify(params)
        });
    }
}
