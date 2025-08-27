// Client Configuration
export interface ClientConfig {
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
    retries?: number;
}

// Document Types
export interface Document {
    id: string;
    name: string;
    status: 'processing' | 'processed' | 'failed';
    fileSize: number;
    pageCount: number;
    uploadedAt: string;
    processedAt?: string;
    uploadedBy: string;
    fileType: string;
}

export interface DocumentUploadOptions {
    enableOCR?: boolean;
    chunkSize?: number;
    overlapSize?: number;
    onProgress?: (progress: number) => void;
    onStatusChange?: (status: Document['status']) => void;
}

export interface DocumentUploadResult {
    documentId: string;
    status: Document['status'];
    uploadUrl?: string;
}

// Thread Types
export interface Thread {
    id: string;
    title: string;
    projectId: string;
    createdAt: string;
    updatedAt: string;
    messageCount: number;
}

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    citations?: Citation[];
    feedback?: 'positive' | 'negative' | null;
}

export interface Citation {
    id: string;
    documentId: string;
    documentName: string;
    page: number;
    paragraph: number;
    text: string;
    score: number;
}

export interface ChatOptions {
    threadId?: string;
    documentIds?: string[];
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
    onStream?: (chunk: string) => void;
}

export interface ChatResponse {
    messageId: string;
    content: string;
    citations: Citation[];
    threadId: string;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

// Project Types
export interface Project {
    id: string;
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
    documentCount: number;
    memberCount: number;
}

export interface ProjectUsage {
    queries: number;
    documents: number;
    cost: number;
    period: string;
}

// Analytics Types
export interface AnalyticsData {
    queriesPerDay: ChartDataPoint[];
    latencyOverTime: ChartDataPoint[];
    tokenSpend: ChartDataPoint[];
    topDocuments: TopDocument[];
    topProjects: TopProject[];
    usageByHour: HourlyUsage[];
    costBreakdown: CostBreakdown[];
}

export interface ChartDataPoint {
    date: string;
    value: number;
    label?: string;
}

export interface TopDocument {
    id: string;
    name: string;
    queries: number;
    percentage: number;
}

export interface TopProject {
    id: string;
    name: string;
    queries: number;
    documents: number;
    percentage: number;
}

export interface HourlyUsage {
    hour: number;
    queries: number;
    avgLatency: number;
}

export interface CostBreakdown {
    category: string;
    amount: number;
    percentage: number;
    color: string;
}

// Export Types
export interface ExportOptions {
    format: 'markdown' | 'pdf' | 'json';
    includeCitations?: boolean;
    includeMetadata?: boolean;
}

export interface ExportResult {
    url: string;
    expiresAt: string;
    format: ExportOptions['format'];
}

// Error Types
export class RAGError extends Error {
    constructor(
        message: string,
        public status?: number,
        public code?: string
    ) {
        super(message);
        this.name = 'RAGError';
    }
}

export class AuthenticationError extends RAGError {
    constructor(message = 'Authentication failed') {
        super(message, 401, 'AUTH_ERROR');
        this.name = 'AuthenticationError';
    }
}

export class RateLimitError extends RAGError {
    constructor(message = 'Rate limit exceeded') {
        super(message, 429, 'RATE_LIMIT_ERROR');
        this.name = 'RateLimitError';
    }
}

export class ValidationError extends RAGError {
    constructor(message = 'Validation failed') {
        super(message, 400, 'VALIDATION_ERROR');
        this.name = 'ValidationError';
    }
}

// Event Types
export interface RealtimeEvent {
    type: string;
    data: any;
    timestamp: string;
}

export interface DocumentStatusEvent {
    documentId: string;
    status: Document['status'];
    progress?: number;
    error?: string;
}

export interface ChatEvent {
    threadId: string;
    message: Message;
}

// Upload Progress Types
export interface UploadProgress {
    fileId: string;
    fileName: string;
    progress: number;
    status: 'uploading' | 'processing' | 'completed' | 'failed';
    error?: string;
}
