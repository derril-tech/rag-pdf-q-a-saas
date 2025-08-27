import { RAGClient } from './client';
import {
    Message,
    Thread,
    AskQuestionOptions,
    ChatResponse,
    Citation
} from './types';

export class ChatManager {
    constructor(private client: RAGClient) { }

    // Ask a question and get an answer
    async askQuestion(
        question: string,
        options: AskQuestionOptions = {}
    ): Promise<ChatResponse> {
        const response = await this.client.request<ChatResponse>('/chat/ask', {
            method: 'POST',
            body: JSON.stringify({
                question,
                threadId: options.threadId,
                projectId: options.projectId,
                documentIds: options.documentIds,
                model: options.model || 'gpt-4',
                temperature: options.temperature || 0.7,
                maxTokens: options.maxTokens || 1000,
                includeCitations: options.includeCitations ?? true,
                stream: options.stream ?? false
            })
        });

        return response;
    }

    // Stream a question response
    async streamQuestion(
        question: string,
        options: AskQuestionOptions & { onChunk: (chunk: string) => void } = {}
    ): Promise<ChatResponse> {
        const { onChunk, ...requestOptions } = options;

        const response = await this.client.request<ChatResponse>('/chat/ask', {
            method: 'POST',
            body: JSON.stringify({
                question,
                threadId: requestOptions.threadId,
                projectId: requestOptions.projectId,
                documentIds: requestOptions.documentIds,
                model: requestOptions.model || 'gpt-4',
                temperature: requestOptions.temperature || 0.7,
                maxTokens: requestOptions.maxTokens || 1000,
                includeCitations: requestOptions.includeCitations ?? true,
                stream: true
            }),
            onChunk
        });

        return response;
    }

    // Create a new thread
    async createThread(options: {
        name?: string;
        projectId?: string;
        documentIds?: string[];
    } = {}): Promise<Thread> {
        return this.client.request<Thread>('/chat/threads', {
            method: 'POST',
            body: JSON.stringify(options)
        });
    }

    // Get thread by ID
    async getThread(threadId: string): Promise<Thread> {
        return this.client.request<Thread>(`/chat/threads/${threadId}`);
    }

    // List threads
    async listThreads(params: {
        projectId?: string;
        limit?: number;
        offset?: number;
    } = {}): Promise<{
        threads: Thread[];
        total: number;
        hasMore: boolean;
    }> {
        const searchParams = new URLSearchParams();
        if (params.projectId) searchParams.append('projectId', params.projectId);
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.offset) searchParams.append('offset', params.offset.toString());

        const query = searchParams.toString();
        const endpoint = query ? `/chat/threads?${query}` : '/chat/threads';

        return this.client.request(endpoint);
    }

    // Delete thread
    async deleteThread(threadId: string): Promise<void> {
        await this.client.request(`/chat/threads/${threadId}`, {
            method: 'DELETE'
        });
    }

    // Update thread
    async updateThread(
        threadId: string,
        updates: Partial<Pick<Thread, 'name'>>
    ): Promise<Thread> {
        return this.client.request<Thread>(`/chat/threads/${threadId}`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        });
    }

    // Get messages in a thread
    async getThreadMessages(
        threadId: string,
        params: {
            limit?: number;
            offset?: number;
        } = {}
    ): Promise<{
        messages: Message[];
        total: number;
        hasMore: boolean;
    }> {
        const searchParams = new URLSearchParams();
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.offset) searchParams.append('offset', params.offset.toString());

        const query = searchParams.toString();
        const endpoint = query
            ? `/chat/threads/${threadId}/messages?${query}`
            : `/chat/threads/${threadId}/messages`;

        return this.client.request(endpoint);
    }

    // Add a message to a thread
    async addMessage(
        threadId: string,
        message: {
            content: string;
            role: 'user' | 'assistant';
            citations?: Citation[];
        }
    ): Promise<Message> {
        return this.client.request<Message>(`/chat/threads/${threadId}/messages`, {
            method: 'POST',
            body: JSON.stringify(message)
        });
    }

    // Update a message
    async updateMessage(
        threadId: string,
        messageId: string,
        updates: Partial<Pick<Message, 'content'>>
    ): Promise<Message> {
        return this.client.request<Message>(
            `/chat/threads/${threadId}/messages/${messageId}`,
            {
                method: 'PATCH',
                body: JSON.stringify(updates)
            }
        );
    }

    // Delete a message
    async deleteMessage(threadId: string, messageId: string): Promise<void> {
        await this.client.request(
            `/chat/threads/${threadId}/messages/${messageId}`,
            {
                method: 'DELETE'
            }
        );
    }

    // Add feedback to a message
    async addFeedback(
        threadId: string,
        messageId: string,
        feedback: {
            type: 'thumbs_up' | 'thumbs_down';
            comment?: string;
        }
    ): Promise<void> {
        await this.client.request(
            `/chat/threads/${threadId}/messages/${messageId}/feedback`,
            {
                method: 'POST',
                body: JSON.stringify(feedback)
            }
        );
    }

    // Search for similar questions
    async searchSimilarQuestions(
        question: string,
        params: {
            projectId?: string;
            limit?: number;
            threshold?: number;
        } = {}
    ): Promise<{
        questions: Array<{
            question: string;
            answer: string;
            similarity: number;
            threadId: string;
            messageId: string;
        }>;
    }> {
        const searchParams = new URLSearchParams();
        searchParams.append('question', question);
        if (params.projectId) searchParams.append('projectId', params.projectId);
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.threshold) searchParams.append('threshold', params.threshold.toString());

        return this.client.request(`/chat/search?${searchParams.toString()}`);
    }

    // Get chat suggestions based on context
    async getSuggestions(
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
            ? `/chat/threads/${threadId}/suggestions?${query}`
            : `/chat/threads/${threadId}/suggestions`;

        return this.client.request(endpoint);
    }

    // Export thread
    async exportThread(
        threadId: string,
        format: 'markdown' | 'html' | 'pdf' | 'json' = 'markdown'
    ): Promise<{
        downloadUrl: string;
        expiresAt: string;
    }> {
        return this.client.request(`/chat/threads/${threadId}/export`, {
            method: 'POST',
            body: JSON.stringify({ format })
        });
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
    }> {
        return this.client.request(`/chat/threads/${threadId}/analytics`);
    }
}
