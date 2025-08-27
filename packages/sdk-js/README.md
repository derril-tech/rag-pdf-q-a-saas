# RAG PDF Q&A JavaScript SDK

A comprehensive JavaScript/TypeScript SDK for interacting with the RAG PDF Q&A SaaS platform.

## Installation

```bash
npm install @rag-pdf-qa/sdk-js
```

## Quick Start

```typescript
import { RAGClient } from '@rag-pdf-qa/sdk-js';

// Initialize the client
const client = new RAGClient({
  baseUrl: 'https://api.rag-pdf-qa.com',
  apiKey: 'your-api-key'
});

// Upload a document
const uploader = client.documents;
const result = await uploader.uploadFile(file, {
  enableOCR: true,
  chunkSize: 1000
});

// Ask a question
const chat = client.chat;
const response = await chat.askQuestion('What is the main topic?', {
  documentIds: [result.documentId]
});

console.log(response.answer);
```

## Features

- **Document Management**: Upload, process, and manage PDF documents
- **Chat Interface**: Ask questions and get AI-powered answers with citations
- **Thread Management**: Organize conversations and track message history
- **Analytics**: Get insights into usage, costs, and performance
- **Real-time Updates**: Stream document processing progress and chat responses
- **TypeScript Support**: Full type definitions for better development experience

## API Reference

### Client Configuration

```typescript
interface ClientConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
  retries?: number;
}
```

### Document Upload

```typescript
// Upload a single file
const result = await client.documents.uploadFile(file, {
  enableOCR: true,
  chunkSize: 1000,
  overlapSize: 200
});

// Upload multiple files
const results = await client.documents.uploadFiles(files);

// Get upload progress
const cleanup = await client.documents.streamUploadProgress(
  documentId,
  (progress) => console.log(progress)
);
```

### Chat & Questions

```typescript
// Ask a question
const response = await client.chat.askQuestion('What is this about?', {
  threadId: 'thread-123',
  documentIds: ['doc-1', 'doc-2'],
  model: 'gpt-4',
  temperature: 0.7
});

// Stream response
const response = await client.chat.streamQuestion(
  'What is this about?',
  {
    onChunk: (chunk) => console.log(chunk)
  }
);

// Create a thread
const thread = await client.chat.createThread({
  name: 'Project Discussion',
  documentIds: ['doc-1']
});
```

### Thread Management

```typescript
// List threads
const { threads } = await client.threads.listThreads({
  projectId: 'project-123',
  limit: 10
});

// Get thread with messages
const { thread, messages } = await client.threads.getThreadWithMessages(
  'thread-123'
);

// Export thread
const { downloadUrl } = await client.threads.exportThread(
  'thread-123',
  'markdown'
);
```

### Analytics

```typescript
// Get analytics overview
const analytics = await client.analytics.getAnalytics({
  projectId: 'project-123',
  dateFrom: '2024-01-01',
  dateTo: '2024-01-31'
});

// Get usage statistics
const usage = await client.analytics.getUsageStats();

// Get cost breakdown
const costs = await client.analytics.getCostBreakdown();

// Get top documents
const { documents } = await client.analytics.getTopDocuments({
  metric: 'citations',
  limit: 10
});
```

## Error Handling

The SDK provides custom error classes for different types of errors:

```typescript
import { RAGError, AuthenticationError, RateLimitError } from '@rag-pdf-qa/sdk-js';

try {
  await client.documents.uploadFile(file);
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.log('Invalid API key');
  } else if (error instanceof RateLimitError) {
    console.log('Rate limit exceeded');
  } else if (error instanceof RAGError) {
    console.log('API error:', error.message);
  }
}
```

## Real-time Features

### WebSocket Connection

```typescript
import { useRealtime } from '@rag-pdf-qa/sdk-js';

const { connect, subscribe } = useRealtime();

// Connect to real-time updates
connect(client);

// Subscribe to chat messages
const unsubscribe = subscribe('chat', (message) => {
  console.log('New message:', message);
});

// Subscribe to document status updates
const unsubscribe = subscribe('document-status', (update) => {
  console.log('Document status:', update);
});
```

### Server-Sent Events

```typescript
// Stream upload progress
const cleanup = await client.documents.streamUploadProgress(
  documentId,
  (progress) => {
    console.log(`Progress: ${progress.percentage}%`);
  }
);

// Clean up when done
cleanup();
```

## Advanced Usage

### Custom Request Configuration

```typescript
const client = new RAGClient({
  baseUrl: 'https://api.rag-pdf-qa.com',
  apiKey: 'your-api-key',
  timeout: 30000,
  retries: 3
});
```

### Batch Operations

```typescript
// Upload multiple documents
const results = await Promise.allSettled(
  files.map(file => client.documents.uploadFile(file))
);

// Process successful uploads
const successful = results
  .filter(result => result.status === 'fulfilled')
  .map(result => (result as PromiseFulfilledResult<any>).value);
```

### Error Retry Logic

```typescript
const uploadWithRetry = async (file: File, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await client.documents.uploadFile(file);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

## Development

```bash
# Install dependencies
npm install

# Build the package
npm run build

# Run tests
npm test

# Run linter
npm run lint

# Type checking
npm run typecheck
```

## License

MIT
