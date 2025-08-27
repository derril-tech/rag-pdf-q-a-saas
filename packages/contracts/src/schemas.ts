// Created automatically by Cursor AI (2025-01-27)

import { z } from 'zod';

// Base schemas
export const UUID = z.string().uuid();
export const Timestamp = z.string().datetime();
export const NonEmptyString = z.string().min(1);

// Enums
export const DocumentStatus = z.enum(['uploaded', 'processing', 'ingested', 'embedded', 'failed']);
export const MessageRole = z.enum(['user', 'assistant', 'system']);
export const ExportFormat = z.enum(['markdown', 'json', 'pdf']);
export const PlanTier = z.enum(['free', 'pro', 'enterprise']);

// Organization schemas
export const Organization = z.object({
    id: UUID,
    name: NonEmptyString,
    slug: z.string().min(1).max(100),
    planTier: PlanTier.default('free'),
    settings: z.record(z.unknown()).default({}),
    createdAt: Timestamp,
    updatedAt: Timestamp,
});

export const CreateOrganizationRequest = z.object({
    name: NonEmptyString,
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
});

export const UpdateOrganizationRequest = z.object({
    name: NonEmptyString.optional(),
    settings: z.record(z.unknown()).optional(),
});

// User schemas
export const User = z.object({
    id: UUID,
    email: z.string().email(),
    name: z.string().optional(),
    avatarUrl: z.string().url().optional(),
    emailVerified: z.boolean().default(false),
    createdAt: Timestamp,
    updatedAt: Timestamp,
});

export const CreateUserRequest = z.object({
    email: z.string().email(),
    name: z.string().optional(),
    avatarUrl: z.string().url().optional(),
});

// Membership schemas
export const Membership = z.object({
    id: UUID,
    orgId: UUID,
    userId: UUID,
    role: z.string().min(1).max(50).default('member'),
    createdAt: Timestamp,
});

export const CreateMembershipRequest = z.object({
    orgId: UUID,
    userId: UUID,
    role: z.string().min(1).max(50).default('member'),
});

// Project schemas
export const Project = z.object({
    id: UUID,
    orgId: UUID,
    name: NonEmptyString,
    description: z.string().optional(),
    settings: z.record(z.unknown()).default({}),
    createdAt: Timestamp,
    updatedAt: Timestamp,
});

export const CreateProjectRequest = z.object({
    name: NonEmptyString,
    description: z.string().optional(),
    settings: z.record(z.unknown()).optional(),
});

export const UpdateProjectRequest = z.object({
    name: NonEmptyString.optional(),
    description: z.string().optional(),
    settings: z.record(z.unknown()).optional(),
});

// Document schemas
export const Document = z.object({
    id: UUID,
    projectId: UUID,
    name: NonEmptyString,
    filePath: z.string(),
    fileSize: z.number().positive(),
    mimeType: z.string().min(1).max(100),
    pageCount: z.number().int().positive().optional(),
    status: DocumentStatus.default('uploaded'),
    metadata: z.record(z.unknown()).default({}),
    createdAt: Timestamp,
    updatedAt: Timestamp,
});

export const CreateDocumentRequest = z.object({
    name: NonEmptyString,
    filePath: z.string(),
    fileSize: z.number().positive(),
    mimeType: z.string().min(1).max(100),
    metadata: z.record(z.unknown()).optional(),
});

export const UpdateDocumentRequest = z.object({
    name: NonEmptyString.optional(),
    metadata: z.record(z.unknown()).optional(),
});

// Chunk schemas
export const Chunk = z.object({
    id: UUID,
    documentId: UUID,
    pageNumber: z.number().int().min(0),
    chunkIndex: z.number().int().min(0),
    content: z.string(),
    embedding: z.array(z.number()).length(1536).optional(), // OpenAI embedding dimension
    metadata: z.record(z.unknown()).default({}),
    createdAt: Timestamp,
});

// Thread schemas
export const Thread = z.object({
    id: UUID,
    projectId: UUID,
    title: z.string().optional(),
    createdBy: UUID.optional(),
    createdAt: Timestamp,
    updatedAt: Timestamp,
});

export const CreateThreadRequest = z.object({
    title: z.string().optional(),
});

export const UpdateThreadRequest = z.object({
    title: z.string().optional(),
});

// Message schemas
export const Citation = z.object({
    documentId: UUID,
    pageNumber: z.number().int().min(0),
    chunkIndex: z.number().int().min(0),
    content: z.string(),
    score: z.number().min(0).max(1),
});

export const Message = z.object({
    id: UUID,
    threadId: UUID,
    role: MessageRole,
    content: z.string(),
    citations: z.array(Citation).default([]),
    metadata: z.record(z.unknown()).default({}),
    createdAt: Timestamp,
});

export const CreateMessageRequest = z.object({
    content: z.string(),
    citations: z.array(Citation).optional(),
    metadata: z.record(z.unknown()).optional(),
});

// QA schemas
export const QARequest = z.object({
    query: z.string().min(1),
    threadId: UUID.optional(),
    projectId: UUID.optional(),
    documentIds: z.array(UUID).optional(),
    maxResults: z.number().int().min(1).max(20).default(10),
    temperature: z.number().min(0).max(2).default(0.7),
});

export const QAResponse = z.object({
    answer: z.string(),
    citations: z.array(Citation),
    threadId: UUID.optional(),
    messageId: UUID.optional(),
    metadata: z.record(z.unknown()).default({}),
});

// Usage stats schemas
export const UsageStats = z.object({
    id: UUID,
    orgId: UUID,
    projectId: UUID.optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    queriesCount: z.number().int().min(0).default(0),
    tokensUsed: z.number().int().min(0).default(0),
    documentsProcessed: z.number().int().min(0).default(0),
    createdAt: Timestamp,
});

// Export schemas
export const ExportRequest = z.object({
    format: ExportFormat,
    threadId: UUID,
});

export const ExportResponse = z.object({
    downloadUrl: z.string().url(),
    expiresAt: Timestamp,
    format: ExportFormat,
    size: z.number().positive(),
});

// Slack schemas
export const SlackInstallRequest = z.object({
    code: z.string(),
    state: z.string().optional(),
});

export const SlackEvent = z.object({
    type: z.string(),
    team_id: z.string(),
    event: z.record(z.unknown()),
});

export const SlackAskRequest = z.object({
    text: z.string(),
    user_id: z.string(),
    team_id: z.string(),
    channel_id: z.string(),
    response_url: z.string().url(),
});

// Pagination schemas
export const PaginationParams = z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
    cursor: z.string().optional(),
});

export const PaginatedResponse = <T extends z.ZodTypeAny>(schema: T) =>
    z.object({
        data: z.array(schema),
        pagination: z.object({
            page: z.number().int().min(1),
            limit: z.number().int().min(1),
            total: z.number().int().min(0),
            hasMore: z.boolean(),
            cursor: z.string().optional(),
        }),
    });

// Error schemas
export const ErrorResponse = z.object({
    error: z.object({
        code: z.string(),
        message: z.string(),
        details: z.record(z.unknown()).optional(),
    }),
    timestamp: Timestamp,
    requestId: z.string(),
});

// API Response schemas
export const APIResponse = <T extends z.ZodTypeAny>(schema: T) =>
    z.object({
        data: schema,
        timestamp: Timestamp,
        requestId: z.string(),
    });

// Type exports
export type Organization = z.infer<typeof Organization>;
export type User = z.infer<typeof User>;
export type Project = z.infer<typeof Project>;
export type Document = z.infer<typeof Document>;
export type Thread = z.infer<typeof Thread>;
export type Message = z.infer<typeof Message>;
export type Citation = z.infer<typeof Citation>;
export type QARequest = z.infer<typeof QARequest>;
export type QAResponse = z.infer<typeof QAResponse>;
export type UsageStats = z.infer<typeof UsageStats>;
export type ExportRequest = z.infer<typeof ExportRequest>;
export type ExportResponse = z.infer<typeof ExportResponse>;
export type SlackEvent = z.infer<typeof SlackEvent>;
export type ErrorResponse = z.infer<typeof ErrorResponse>;
