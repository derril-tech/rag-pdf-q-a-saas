# RAG PDF Q&A SaaS

A comprehensive, enterprise-ready SaaS application for document-based question answering using Retrieval-Augmented Generation (RAG). Upload PDFs, ask questions, and get AI-powered answers with citations.

## 🚀 Features

### Core Functionality
- **Document Upload & Processing**: Secure PDF upload with virus scanning, OCR detection, and text extraction
- **Semantic Search**: Advanced RAG with hybrid retrieval (vector + BM25) and intelligent reranking
- **Conversational QA**: Context-aware question answering with accurate citations and page references
- **Multi-format Export**: Export conversations as Markdown, HTML, PDF, or JSON bundles
- **Real-time Chat**: WebSocket/SSE-powered chat interface with streaming responses

### Enterprise Features
- **Multi-tenant Architecture**: Row-Level Security (RLS) for complete organization isolation
- **Slack Integration**: OAuth install, slash commands (`/askdoc`), and event webhooks
- **Usage-based Billing**: Stripe integration with token/minute tracking and plan management
- **HIPAA Compliance**: Stricter audit logging, integration restrictions, and violation monitoring
- **Audit Logging**: Comprehensive audit trail for all major actions

### Developer Experience
- **Modern Tech Stack**: Next.js frontend, NestJS gateway, Python workers
- **Type Safety**: Full TypeScript coverage with Zod schemas and Pydantic models
- **Comprehensive Testing**: Unit, integration, contract, E2E, load, chaos, and security tests
- **CI/CD Pipeline**: GitHub Actions with automated testing, building, and deployment
- **Infrastructure as Code**: Terraform modules for all cloud resources

### Observability & Monitoring
- **Distributed Tracing**: OpenTelemetry spans across all services
- **Metrics Collection**: Prometheus metrics for performance monitoring
- **Error Tracking**: Sentry integration for real-time error monitoring
- **Dashboards**: Grafana dashboards for system overview and analytics
- **Alerting**: Slack, PagerDuty, and email notifications for critical issues

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Gateway      │    │    Workers      │
│   (Next.js)     │◄──►│   (NestJS)      │◄──►│   (Python)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │     Redis       │    │      NATS       │
│   (pgvector)    │    │   (Caching)     │    │   (Messaging)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   MinIO/S3      │    │   Prometheus    │    │     Grafana     │
│   (Storage)     │    │   (Metrics)     │    │  (Dashboards)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Service Architecture

#### Frontend (Next.js)
- **Modern UI**: Responsive design with Tailwind CSS
- **State Management**: TanStack Query for server state, Zustand for UI state
- **Real-time Updates**: WebSocket/SSE for live chat and document status
- **Export Functionality**: Multiple format exports with citations

#### Gateway (NestJS)
- **REST API**: OpenAPI 3.1 compliant endpoints
- **Authentication**: JWT-based authentication with role-based access
- **Rate Limiting**: Redis-based rate limiting and request tracking
- **Middleware**: Problem+JSON error handling, request ID tracking
- **Monitoring**: Prometheus metrics and OpenTelemetry tracing

#### Workers (Python)
- **ingest-worker**: Document processing, virus scanning, OCR detection
- **embed-worker**: Text chunking, embedding generation, vector storage
- **qa-worker**: RAG pipeline, LLM integration, citation generation
- **slack-worker**: Slack integration, OAuth, slash commands
- **export-worker**: Multi-format export generation
- **analytics-worker**: Usage tracking and analytics aggregation

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query, Zustand
- **UI Components**: Custom components with accessibility
- **Real-time**: WebSocket/SSE for live updates

### Backend
- **Gateway**: NestJS with TypeScript
- **Workers**: Python with FastAPI
- **Database**: PostgreSQL 16 with pgvector extension
- **Cache**: Redis for session and rate limiting
- **Message Queue**: NATS for async processing
- **Storage**: MinIO/S3 for document storage

### Infrastructure
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Kubernetes with Helm charts
- **Infrastructure**: Terraform for cloud resources
- **CI/CD**: GitHub Actions with automated pipelines
- **Monitoring**: Prometheus, Grafana, Sentry, OpenTelemetry

### AI/ML
- **Embeddings**: OpenAI embeddings with pgvector storage
- **LLM**: OpenAI GPT-4 for question answering
- **RAG Pipeline**: LangChain with hybrid retrieval
- **Text Processing**: LangChain text splitters, OCR with Tesseract

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+ and pip
- Docker and Docker Compose
- PostgreSQL 16+ with pgvector extension
- Redis 7+
- NATS 2.9+

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/rag-pdf-qa-saas.git
   cd rag-pdf-qa-saas
   ```

2. **Setup environment variables**
   ```bash
   # Copy environment templates
   cp apps/frontend/.env.example apps/frontend/.env
   cp apps/gateway/.env.example apps/gateway/.env
   cp apps/workers/.env.example apps/workers/.env
   
   # Edit with your configuration
   # See Configuration section below
   ```

3. **Start development environment**
   ```bash
   # Start all services with Docker Compose
   docker-compose up -d
   
   # Or start individual services
   docker-compose up postgres redis nats minio clamav
   ```

4. **Install dependencies and start services**
   ```bash
   # Frontend
   cd apps/frontend
   npm install
   npm run dev
   
   # Gateway
   cd apps/gateway
   npm install
   npm run start:dev
   
   # Workers
   cd apps/workers
   pip install -r requirements.txt
   python -m uvicorn app.main:app --reload
   ```

5. **Run database migrations**
   ```bash
   cd apps/gateway
   npm run migration:run
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Gateway API: http://localhost:3001
   - API Documentation: http://localhost:3001/docs

## ⚙️ Configuration

### Environment Variables

#### Frontend (.env)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

#### Gateway (.env)
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/rag_saas

# Redis
REDIS_URL=redis://localhost:6379

# NATS
NATS_URL=nats://localhost:4222

# S3/MinIO
S3_BUCKET=rag-documents
S3_ACCESS_KEY=your_access_key
S3_SECRET_KEY=your_secret_key
S3_ENDPOINT=http://localhost:9000

# OpenAI
OPENAI_API_KEY=sk-...

# JWT
JWT_SECRET=your_jwt_secret

# Sentry
SENTRY_DSN=https://...
```

#### Workers (.env)
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/rag_saas

# Redis
REDIS_URL=redis://localhost:6379

# NATS
NATS_URL=nats://localhost:4222

# S3/MinIO
S3_BUCKET=rag-documents
S3_ACCESS_KEY=your_access_key
S3_SECRET_KEY=your_secret_key
S3_ENDPOINT=http://localhost:9000

# OpenAI
OPENAI_API_KEY=sk-...

# Sentry
SENTRY_DSN=https://...
```

## 🧪 Testing

### Running Tests

```bash
# Unit tests
cd apps/workers
python -m pytest tests/unit/ -v

# Integration tests
python -m pytest tests/integration/ -v

# Contract tests
python -m pytest tests/contract/ -v

# E2E tests
python -m pytest tests/e2e/ -v

# Load tests
python -m pytest tests/load/ -v

# Chaos tests
python -m pytest tests/chaos/ -v

# Security tests
python -m pytest tests/security/ -v

# All tests
python -m pytest tests/ -v
```

### Test Coverage

```bash
# Generate coverage report
python -m pytest tests/ --cov=app --cov-report=html
open htmlcov/index.html
```

## 🚀 Deployment

### Staging Deployment

```bash
# Deploy to staging
cd ops/staging
./deploy.sh full

# Or deploy individual components
./deploy.sh build
./deploy.sh infrastructure
./deploy.sh kubernetes
./deploy.sh monitoring
```

### Production Deployment

```bash
# Deploy to production
cd ops/production
./deploy.sh full

# Or deploy individual components
./deploy.sh build
./deploy.sh infrastructure
./deploy.sh monitoring
./deploy.sh services
./deploy.sh alerting
```

### Kubernetes Deployment

```bash
# Apply Kubernetes manifests
kubectl apply -f ops/staging/k8s/ -n rag-staging
kubectl apply -f ops/production/k8s/ -n rag-production

# Check deployment status
kubectl get pods -n rag-staging
kubectl get services -n rag-staging
kubectl get ingress -n rag-staging
```

## 📊 Monitoring & Observability

### Metrics Dashboard
- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090
- **AlertManager**: http://localhost:9093

### Key Metrics
- **Application**: Request rate, response time, error rate
- **Database**: Connection pool, query performance, pgvector operations
- **Workers**: Queue depth, processing time, success rate
- **Infrastructure**: CPU, memory, disk usage, network

### Alerting
- **Critical**: Service down, database connection issues
- **Warning**: High response time, memory usage, queue backlog
- **Info**: Deployment notifications, feature flags

## 🔒 Security

### Authentication & Authorization
- JWT-based authentication with secure token handling
- Role-based access control (RBAC) for all endpoints
- Row-Level Security (RLS) for multi-tenant data isolation
- API key management for external integrations

### Data Protection
- PII masking and data anonymization
- Encrypted storage for sensitive data
- Signed URLs for secure file access
- Audit logging for compliance

### Infrastructure Security
- Network policies and security groups
- Container security scanning
- Secrets management with Kubernetes secrets
- SSL/TLS encryption for all communications

## 🔧 Development

### Project Structure
```
rag-pdf-qa-saas/
├── apps/
│   ├── frontend/          # Next.js frontend application
│   ├── gateway/           # NestJS API gateway
│   └── workers/           # Python worker services
├── packages/
│   ├── contracts/         # Shared TypeScript interfaces
│   └── sdk-js/           # JavaScript SDK
├── ops/
│   ├── staging/          # Staging deployment configs
│   ├── production/       # Production deployment configs
│   └── terraform/        # Infrastructure as Code
├── docs/                 # Documentation
└── tests/                # Test suites
```

### Development Workflow

1. **Feature Development**
   ```bash
   # Create feature branch
   git checkout -b feature/new-feature
   
   # Make changes
   # Run tests
   npm run test
   python -m pytest tests/
   
   # Commit changes
   git commit -m "feat: add new feature"
   ```

2. **Code Quality**
   ```bash
   # Lint code
   npm run lint
   python -m flake8 app/
   
   # Type check
   npm run typecheck
   python -m mypy app/
   
   # Format code
   npm run format
   python -m black app/
   ```

3. **Testing**
   ```bash
   # Run all tests
   npm run test:all
   python -m pytest tests/ -v
   
   # Run specific test suites
   npm run test:unit
   python -m pytest tests/unit/ -v
   ```

## 📚 API Documentation

### Core Endpoints

#### Projects
```http
POST /v1/projects
GET /v1/projects
GET /v1/projects/{id}
PUT /v1/projects/{id}
DELETE /v1/projects/{id}
```

#### Documents
```http
POST /v1/documents/upload-url
POST /v1/documents
POST /v1/documents/{id}/process
GET /v1/documents/{id}
GET /v1/documents
DELETE /v1/documents/{id}
```

#### Threads & Messages
```http
POST /v1/threads
GET /v1/threads/{id}
POST /v1/threads/{id}/messages
GET /v1/threads/{id}/messages
```

#### Question Answering
```http
POST /v1/qa
GET /v1/threads/{id}/export?format=md|json|pdf
```

#### Slack Integration
```http
POST /v1/slack/install
POST /v1/slack/events
POST /v1/slack/ask
```

### SDK Usage

```javascript
import { RAGClient } from '@your-org/rag-sdk';

const client = new RAGClient({
  apiUrl: 'https://api.yourapp.com',
  apiKey: 'your-api-key'
});

// Upload document
const document = await client.uploadDocument(file, {
  projectId: 'proj_123',
  enableOcr: true
});

// Ask question
const answer = await client.askQuestion({
  question: 'What is the main topic?',
  threadId: 'thread_456'
});

// Export conversation
const export = await client.exportThread('thread_456', 'markdown');
```

## 🤝 Contributing

### Development Setup

1. **Fork the repository**
2. **Create a feature branch**
3. **Make your changes**
4. **Add tests for new functionality**
5. **Ensure all tests pass**
6. **Submit a pull request**

### Code Standards

- **TypeScript**: Strict mode, no `any` types
- **Python**: Type hints, docstrings, PEP 8
- **Testing**: Minimum 80% code coverage
- **Documentation**: Update README and API docs
- **Commits**: Conventional commit format

### Pull Request Process

1. **Create descriptive PR title**
2. **Add detailed description**
3. **Include screenshots for UI changes**
4. **Link related issues**
5. **Request reviews from maintainers**

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- [API Documentation](https://docs.yourapp.com)
- [Deployment Guide](https://docs.yourapp.com/deployment)
- [Troubleshooting](https://docs.yourapp.com/troubleshooting)

### Community
- [Discussions](https://github.com/your-org/rag-pdf-qa-saas/discussions)
- [Issues](https://github.com/your-org/rag-pdf-qa-saas/issues)
- [Discord](https://discord.gg/yourapp)

### Enterprise Support
- **Email**: enterprise@yourapp.com
- **Phone**: +1-555-123-4567
- **Slack**: #enterprise-support

## 🗺️ Roadmap

### Q1 2024
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Custom embedding models
- [ ] API rate limiting improvements

### Q2 2024
- [ ] Mobile application
- [ ] Advanced search filters
- [ ] Document versioning
- [ ] Team collaboration features

### Q3 2024
- [ ] AI-powered document summarization
- [ ] Advanced export templates
- [ ] Integration marketplace
- [ ] White-label solutions

### Q4 2024
- [ ] Real-time collaboration
- [ ] Advanced security features
- [ ] Performance optimizations
- [ ] Enterprise SSO integration

## 🙏 Acknowledgments

- **OpenAI** for GPT models and embeddings
- **LangChain** for RAG framework
- **pgvector** for vector similarity search
- **NestJS** for the robust backend framework
- **Next.js** for the modern frontend framework
- **Tailwind CSS** for the beautiful UI components

---

**Built with ❤️ by the RAG PDF Q&A SaaS Team**
