import { RAGClient } from './client';
import {
    Thread,
    Message,
    Project,
    Document
} from './types';

export class ThreadManager {
    constructor(private client: RAGClient) { }

    // Get thread by ID with full details
    async getThread(threadId: string): Promise<Thread> {
        return this.client.request<Thread>(`/threads/${threadId}`);
    }

    // List all threads with pagination
    async listThreads(params: {
        projectId?: string;
        limit?: number;
        offset?: number;
        sortBy?: 'created_at' | 'updated_at' | 'name';
        sortOrder?: 'asc' | 'desc';
    } = {}): Promise<{
        threads: Thread[];
        total: number;
        hasMore: boolean;
    }> {
        const searchParams = new URLSearchParams();
        if (params.projectId) searchParams.append('projectId', params.projectId);
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.offset) searchParams.append('offset', params.offset.toString());
        if (params.sortBy) searchParams.append('sortBy', params.sortBy);
        if (params.sortOrder) searchParams.append('sortOrder', params.sortOrder);

        const query = searchParams.toString();
        const endpoint = query ? `/threads?${query}` : '/threads';

        return this.client.request(endpoint);
    }

    // Create a new thread
    async createThread(options: {
        name?: string;
        projectId?: string;
        documentIds?: string[];
        description?: string;
    } = {}): Promise<Thread> {
        return this.client.request<Thread>('/threads', {
            method: 'POST',
            body: JSON.stringify(options)
        });
    }

    // Update thread metadata
    async updateThread(
        threadId: string,
        updates: Partial<Pick<Thread, 'name' | 'description'>>
    ): Promise<Thread> {
        return this.client.request<Thread>(`/threads/${threadId}`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        });
    }

    // Delete thread
    async deleteThread(threadId: string): Promise<void> {
        await this.client.request(`/threads/${threadId}`, {
            method: 'DELETE'
        });
    }

    // Get messages in a thread with pagination
    async getThreadMessages(
        threadId: string,
        params: {
            limit?: number;
            offset?: number;
            sortBy?: 'created_at';
            sortOrder?: 'asc' | 'desc';
        } = {}
    ): Promise<{
        messages: Message[];
        total: number;
        hasMore: boolean;
    }> {
        const searchParams = new URLSearchParams();
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.offset) searchParams.append('offset', params.offset.toString());
        if (params.sortBy) searchParams.append('sortBy', params.sortBy);
        if (params.sortOrder) searchParams.append('sortOrder', params.sortOrder);

        const query = searchParams.toString();
        const endpoint = query
            ? `/threads/${threadId}/messages?${query}`
            : `/threads/${threadId}/messages`;

        return this.client.request(endpoint);
    }

    // Get thread with all messages (convenience method)
    async getThreadWithMessages(
        threadId: string,
        params: {
            messageLimit?: number;
            messageOffset?: number;
        } = {}
    ): Promise<{
        thread: Thread;
        messages: Message[];
        totalMessages: number;
        hasMoreMessages: boolean;
    }> {
        const [thread, messagesData] = await Promise.all([
            this.getThread(threadId),
            this.getThreadMessages(threadId, {
                limit: params.messageLimit,
                offset: params.messageOffset
            })
        ]);

        return {
            thread,
            messages: messagesData.messages,
            totalMessages: messagesData.total,
            hasMoreMessages: messagesData.hasMore
        };
    }

    // Get thread analytics
    async getThreadAnalytics(threadId: string): Promise<{
        messageCount: number;
        totalTokens: number;
        averageResponseTime: number;
        userSatisfaction: number;
        topCitedDocuments: Array<{
            documentId: string;
            documentName: string;
            citationCount: number;
        }>;
        usageByDay: Array<{
            date: string;
            messageCount: number;
            tokenCount: number;
        }>;
    }> {
        return this.client.request(`/threads/${threadId}/analytics`);
    }

    // Get thread suggestions
    async getThreadSuggestions(
        threadId: string,
        params: {
            limit?: number;
        } = {}
    ): Promise<{
        suggestions: string[];
    }> {
        const searchParams = new URLSearchParams();
        if (params.limit) searchParams.append('limit', params.limit.toString());

        const query = searchParams.toString();
        const endpoint = query
            ? `/threads/${threadId}/suggestions?${query}`
            : `/threads/${threadId}/suggestions`;

        return this.client.request(endpoint);
    }

    // Export thread
    async exportThread(
        threadId: string,
        format: 'markdown' | 'html' | 'pdf' | 'json' = 'markdown',
        options: {
            includeMetadata?: boolean;
            includeCitations?: boolean;
        } = {}
    ): Promise<{
        downloadUrl: string;
        expiresAt: string;
        fileSize?: number;
    }> {
        return this.client.request(`/threads/${threadId}/export`, {
            method: 'POST',
            body: JSON.stringify({
                format,
                includeMetadata: options.includeMetadata ?? true,
                includeCitations: options.includeCitations ?? true
            })
        });
    }

    // Get thread documents
    async getThreadDocuments(threadId: string): Promise<{
        documents: Document[];
        total: number;
    }> {
        return this.client.request(`/threads/${threadId}/documents`);
    }

    // Add documents to thread
    async addDocumentsToThread(
        threadId: string,
        documentIds: string[]
    ): Promise<void> {
        await this.client.request(`/threads/${threadId}/documents`, {
            method: 'POST',
            body: JSON.stringify({ documentIds })
        });
    }

    // Remove documents from thread
    async removeDocumentsFromThread(
        threadId: string,
        documentIds: string[]
    ): Promise<void> {
        await this.client.request(`/threads/${threadId}/documents`, {
            method: 'DELETE',
            body: JSON.stringify({ documentIds })
        });
    }

    // Get thread project
    async getThreadProject(threadId: string): Promise<Project> {
        return this.client.request<Project>(`/threads/${threadId}/project`);
    }

    // Search threads
    async searchThreads(
        query: string,
        params: {
            projectId?: string;
            limit?: number;
            offset?: number;
        } = {}
    ): Promise<{
        threads: Array<Thread & { relevance: number }>;
        total: number;
        hasMore: boolean;
    }> {
        const searchParams = new URLSearchParams();
        searchParams.append('q', query);
        if (params.projectId) searchParams.append('projectId', params.projectId);
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.offset) searchParams.append('offset', params.offset.toString());

        return this.client.request(`/threads/search?${searchParams.toString()}`);
    }

    // Get thread statistics
    async getThreadStats(params: {
        projectId?: string;
        dateFrom?: string;
        dateTo?: string;
    } = {}): Promise<{
        totalThreads: number;
        totalMessages: number;
        averageMessagesPerThread: number;
        averageResponseTime: number;
        userSatisfaction: number;
        threadsByDay: Array<{
            date: string;
            threadCount: number;
            messageCount: number;
        }>;
    }> {
        const searchParams = new URLSearchParams();
        if (params.projectId) searchParams.append('projectId', params.projectId);
        if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
        if (params.dateTo) searchParams.append('dateTo', params.dateTo);

        const query = searchParams.toString();
        const endpoint = query ? `/threads/stats?${query}` : '/threads/stats';

        return this.client.request(endpoint);
    }

    // Archive thread
    async archiveThread(threadId: string): Promise<Thread> {
        return this.client.request<Thread>(`/threads/${threadId}/archive`, {
            method: 'POST'
        });
    }

    // Unarchive thread
    async unarchiveThread(threadId: string): Promise<Thread> {
        return this.client.request<Thread>(`/threads/${threadId}/unarchive`, {
            method: 'POST'
        });
    }

    // Get archived threads
    async getArchivedThreads(params: {
        projectId?: string;
        limit?: number;
        offset?: number;
    } = {}): Promise<{
        threads: Thread[];
        total: number;
        hasMore: boolean;
    }> {
        const searchParams = new URLSearchParams();
        searchParams.append('archived', 'true');
        if (params.projectId) searchParams.append('projectId', params.projectId);
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.offset) searchParams.append('offset', params.offset.toString());

        return this.client.request(`/threads?${searchParams.toString()}`);
    }
}
