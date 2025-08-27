import { RAGClient } from './client';
import {
    Document,
    DocumentUploadOptions,
    DocumentUploadResult,
    UploadProgress
} from './types';

export class DocumentUploader {
    constructor(private client: RAGClient) { }

    // Get presigned upload URL
    async getUploadUrl(
        fileName: string,
        fileSize: number,
        options: DocumentUploadOptions = {}
    ): Promise<{
        uploadUrl: string;
        documentId: string;
        fields: Record<string, string>;
    }> {
        const response = await this.client.request<{
            uploadUrl: string;
            documentId: string;
            fields: Record<string, string>;
        }>('/documents/upload-url', {
            method: 'POST',
            body: JSON.stringify({
                fileName,
                fileSize,
                enableOCR: options.enableOCR ?? true,
                chunkSize: options.chunkSize ?? 1000,
                overlapSize: options.overlapSize ?? 200
            })
        });

        return response;
    }

    // Upload file using presigned URL
    async uploadFile(
        file: File,
        options: DocumentUploadOptions = {}
    ): Promise<DocumentUploadResult> {
        // Get presigned URL
        const { uploadUrl, documentId, fields } = await this.getUploadUrl(
            file.name,
            file.size,
            options
        );

        // Create form data
        const formData = new FormData();
        Object.entries(fields).forEach(([key, value]) => {
            formData.append(key, value);
        });
        formData.append('file', file);

        // Upload to S3
        const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            body: formData
        });

        if (!uploadResponse.ok) {
            throw new Error('Failed to upload file to S3');
        }

        // Trigger processing
        await this.client.request(`/documents/${documentId}/process`, {
            method: 'POST'
        });

        return {
            documentId,
            status: 'processing'
        };
    }

    // Get document by ID
    async getDocument(documentId: string): Promise<Document> {
        return this.client.request<Document>(`/documents/${documentId}`);
    }

    // List documents
    async listDocuments(params: {
        projectId?: string;
        status?: Document['status'];
        limit?: number;
        offset?: number;
    } = {}): Promise<{
        documents: Document[];
        total: number;
        hasMore: boolean;
    }> {
        const searchParams = new URLSearchParams();
        if (params.projectId) searchParams.append('projectId', params.projectId);
        if (params.status) searchParams.append('status', params.status);
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.offset) searchParams.append('offset', params.offset.toString());

        const query = searchParams.toString();
        const endpoint = query ? `/documents?${query}` : '/documents';

        return this.client.request(endpoint);
    }

    // Delete document
    async deleteDocument(documentId: string): Promise<void> {
        await this.client.request(`/documents/${documentId}`, {
            method: 'DELETE'
        });
    }

    // Update document metadata
    async updateDocument(
        documentId: string,
        updates: Partial<Pick<Document, 'name'>>
    ): Promise<Document> {
        return this.client.request<Document>(`/documents/${documentId}`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        });
    }

    // Get document processing status
    async getProcessingStatus(documentId: string): Promise<{
        status: Document['status'];
        progress?: number;
        error?: string;
    }> {
        return this.client.request(`/documents/${documentId}/status`);
    }

    // Wait for document processing to complete
    async waitForProcessing(
        documentId: string,
        options: {
            timeout?: number;
            pollInterval?: number;
            onProgress?: (progress: number) => void;
        } = {}
    ): Promise<Document> {
        const { timeout = 300000, pollInterval = 2000, onProgress } = options;
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            const status = await this.getProcessingStatus(documentId);

            if (onProgress && status.progress !== undefined) {
                onProgress(status.progress);
            }

            if (status.status === 'processed') {
                return this.getDocument(documentId);
            }

            if (status.status === 'failed') {
                throw new Error(status.error || 'Document processing failed');
            }

            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }

        throw new Error('Document processing timeout');
    }

    // Upload multiple files
    async uploadFiles(
        files: File[],
        options: DocumentUploadOptions = {}
    ): Promise<DocumentUploadResult[]> {
        const results: DocumentUploadResult[] = [];

        for (const file of files) {
            try {
                const result = await this.uploadFile(file, options);
                results.push(result);
            } catch (error) {
                console.error(`Failed to upload ${file.name}:`, error);
                results.push({
                    documentId: '',
                    status: 'failed'
                });
            }
        }

        return results;
    }

    // Stream upload progress (if supported by server)
    async streamUploadProgress(
        documentId: string,
        onProgress: (progress: UploadProgress) => void
    ): Promise<void> {
        const eventSource = new EventSource(
            `${this.client['config'].baseUrl}/v1/documents/${documentId}/progress`,
            {
                headers: {
                    'Authorization': `Bearer ${this.client['config'].apiKey}`
                }
            }
        );

        eventSource.onmessage = (event) => {
            try {
                const progress: UploadProgress = JSON.parse(event.data);
                onProgress(progress);
            } catch (error) {
                console.error('Failed to parse upload progress:', error);
            }
        };

        eventSource.onerror = (error) => {
            console.error('Upload progress stream error:', error);
            eventSource.close();
        };

        // Return a cleanup function
        return () => {
            eventSource.close();
        };
    }
}
