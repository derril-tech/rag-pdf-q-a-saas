import { ClientConfig, RAGError, AuthenticationError, RateLimitError } from './types';
import { DocumentUploader } from './uploader';
import { ChatManager } from './chat';
import { ThreadManager } from './threads';
import { AnalyticsManager } from './analytics';

export class RAGClient {
    private config: Required<ClientConfig>;
    public documents: DocumentUploader;
    public chat: ChatManager;
    public threads: ThreadManager;
    public analytics: AnalyticsManager;

    constructor(config: ClientConfig) {
        this.config = {
            baseUrl: config.baseUrl || 'https://api.rag-pdf-qa.com',
            timeout: config.timeout || 30000,
            retries: config.retries || 3,
            ...config
        };

        // Initialize managers
        this.documents = new DocumentUploader(this);
        this.chat = new ChatManager(this);
        this.threads = new ThreadManager(this);
        this.analytics = new AnalyticsManager(this);
    }

    // HTTP request helper
    async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.config.baseUrl}/v1${endpoint}`;

        const defaultHeaders = {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        const requestOptions: RequestInit = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            }
        };

        let lastError: Error;

        for (let attempt = 0; attempt <= this.config.retries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

                const response = await fetch(url, {
                    ...requestOptions,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));

                    switch (response.status) {
                        case 401:
                            throw new AuthenticationError(errorData.message || 'Authentication failed');
                        case 429:
                            throw new RateLimitError(errorData.message || 'Rate limit exceeded');
                        case 400:
                            throw new RAGError(errorData.message || 'Bad request', response.status);
                        case 404:
                            throw new RAGError('Resource not found', response.status);
                        case 500:
                            throw new RAGError('Internal server error', response.status);
                        default:
                            throw new RAGError(
                                errorData.message || `HTTP ${response.status}`,
                                response.status
                            );
                    }
                }

                return await response.json();
            } catch (error) {
                lastError = error as Error;

                // Don't retry on certain errors
                if (error instanceof AuthenticationError || error instanceof RateLimitError) {
                    throw error;
                }

                // Don't retry on abort (timeout)
                if (error instanceof Error && error.name === 'AbortError') {
                    throw new RAGError('Request timeout', 408);
                }

                // If this is the last attempt, throw the error
                if (attempt === this.config.retries) {
                    throw lastError;
                }

                // Wait before retrying (exponential backoff)
                await new Promise(resolve =>
                    setTimeout(resolve, Math.pow(2, attempt) * 1000)
                );
            }
        }

        throw lastError!;
    }

    // Health check
    async healthCheck(): Promise<{ status: string; timestamp: string }> {
        return this.request('/health');
    }

    // Get user info
    async getUserInfo(): Promise<{
        id: string;
        email: string;
        name: string;
        organizationId: string;
    }> {
        return this.request('/user');
    }

    // Get API usage
    async getUsage(): Promise<{
        queries: number;
        documents: number;
        cost: number;
        period: string;
    }> {
        return this.request('/usage');
    }
}
