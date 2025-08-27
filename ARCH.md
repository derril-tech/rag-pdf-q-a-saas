# Architecture Overview — RAG PDF Q&A SaaS

## High-Level Topology
- **Frontend:** Next.js 14 (Mantine UI + Tailwind); deployed on Vercel.
- **API Gateway:** NestJS (Node 20, TypeScript); REST `/v1`; Zod validation; Problem+JSON; RBAC; RLS; rate limits; Idempotency-Key; Request-ID.
- **Workers (Python 3.11 + FastAPI):**
  - ingest-worker (pdfminer/pymupdf + OCR fallback)
  - embed-worker (LangChain splitters + embeddings)
  - qa-worker (retrieval + LLM chain with citations)
  - slack-worker (Slack app connector)
  - export-worker (thread/chat export MD/JSON/PDF)
  - analytics-worker (usage aggregation, feedback)
- **Queues/Bus:** NATS or Redis Streams; Celery/RQ orchestrator.
- **Datastores:**
  - Postgres 16 (+pgvector) as source of truth
  - LanceDB/FAISS for vector retrieval
  - Redis for session, cache, jobs
  - S3/R2 for documents & exports
- **Observability:** OpenTelemetry, Prometheus/Grafana, Sentry
- **Secrets:** Cloud Secrets Manager/KMS

## Data Model (Core Tables)
- Identity: `orgs`, `users`, `memberships`, `api_keys`
- Projects/docs: `projects`, `documents`
- Embeddings: `chunks`
- QA/chat: `threads`, `messages`
- Analytics: `usage_stats`
- Collaboration: `comments`, `audit_log`

**Invariants**
- RLS enforced at org/project level.
- `chunks` only created after ingest/OCR success.
- `messages.cites` reference valid document/page.
- Retention sweeps enforce plan limits.

## API Surface (REST `/v1`)
- Projects/docs: `POST /projects`, `POST /documents/upload-url`, `POST /documents/:id/process`, `GET /documents/:id`
- QA/threads: `POST /qa`, `POST /threads/:id/messages`, `GET /threads/:id/messages`
- Slack integration: `POST /slack/install`, `POST /slack/events`, `POST /slack/ask`
- Exports: `GET /threads/:id/export?format=md|json|pdf`
- Analytics: `GET /projects/:id/usage?from&to`
- Conventions: Idempotency-Key, Problem+JSON, cursor pagination

## Pipelines
- **Ingest:** download → parse (pdfminer) → OCR fallback → text extraction → store docs/chunks
- **Embed:** semantic splitting (LangChain) → embeddings (OpenAI/local) → pgvector/LanceDB
- **QA:** hybrid retrieval (vector + BM25) → rerank → LLM answer with citations → persist messages
- **Slack:** events → map org/project → call QA → reply
- **Export:** collect messages → render MD/HTML/PDF → signed URL
- **Analytics:** log queries/tokens/latency → nightly aggregate

## Realtime
- WS: `doc:{id}:status`, `thread:{id}:messages`, `usage:org:{id}`
- Presence: typing indicators; viewer presence in threads

## Caching & Performance
- Redis: recent embeddings, last answers per thread
- Query deduplication; identical queries return cached
- SSE streaming for token-by-token answers

## Observability
- OTel spans tagged by org, doc_id, project_id, query
- Metrics: ingest latency, embedding throughput, QA latency, Slack response time
- Alerts: QA fail rate >5% triggers ops

## Security & Compliance
- TLS/HSTS; signed URLs; encryption at rest
- Tenant isolation via RLS
- Audit log for all key actions
- PII masking; DSR endpoints
- SOC2/ISO templates for enterprise

## Frontend (Next.js + Mantine)
- Pages: dashboard, documents list, upload, thread chat, analytics, integrations
- Components: Uploader, DocumentList, ThreadChat, AnswerCitation, ProjectUsage, SlackConnect, Comments, AnalyticsDash
- State: TanStack Query + Zustand
- Realtime: WS/SSE for chat + doc status
- Accessibility: Mantine ARIA compliance; i18n with next-intl

## SDKs & Integrations
- Slack bot (`/askdoc`) → forwards query to QA
- REST QA endpoint `/qa`
- Exports as MD, JSON, PDF
- JS SDK for FE apps

## DevOps & Deployment
- Deploy FE: Vercel
- Deploy APIs/workers: Fly/Render/GKE
- Databases: Managed Postgres + pgvector, LanceDB/FAISS cluster
- Cache/queue: Managed Redis/NATS
- Object storage: S3/R2 with lifecycle rules
- CI/CD: GitHub Actions (lint, typecheck, tests, docker build, scan, sign, deploy)
- IaC: Terraform modules (DB, Redis, buckets, CDN, secrets)
- Environments: dev/staging/prod

**SLOs**
- Ingest 100-page PDF < 2 min
- Query latency < 3s p95
- QA fail rate < 2%
- WS delivery < 250 ms p95
