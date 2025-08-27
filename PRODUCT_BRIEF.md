# RAG PDF Q\&A SaaS — END‑TO‑END PRODUCT BLUEPRINT

*(React 18 + Next.js 14 App Router; **Mantine UI** for polished, data‑centric look; TypeScript‑first contracts; Node/NestJS API; Python workers (LangChain, LanceDB/FAISS, LLMs); Postgres + pgvector; Redis; S3/R2; multi‑tenant; usage billing.)*

---

## 1) Product Description & Presentation

**One‑liner**
“Turn PDFs into living knowledge bases.” Upload documents (manuals, research, contracts, whitepapers, textbooks) and let your team **chat with them**, get **instant answers**, and build **searchable knowledge hubs**.

**What it produces**

* **Embeddings index** of PDF contents (per org/project).
* **Semantic Q\&A** responses with citations (page/paragraph anchors).
* **Chat history** threads with roles (user/assistant).
* **Artifacts**: Markdown/HTML answers with references; JSON bundles; exportable chat logs.
* **Multi‑doc projects** with cross‑document context.
* **Integrations**: Slack Q\&A bot, API endpoints.

**Scope/Safety**

* Works for textual PDFs (OCR fallback for scanned).
* Cites sources always (page numbers).
* Not legal/medical advice by default; disclaimers attached.
* Privacy: tenant‑isolated indexes; retention windows.

---

## 2) Target User

* Internal teams (engineering, support, legal, HR, research).
* Agencies & consultancies managing client documents.
* Students/researchers needing Q\&A over study material.
* Enterprises needing secure doc‑based knowledge search.

---

## 3) Features & Functionalities (Extensive)

### Upload & Processing

* Accepts PDF, DOCX, TXT (converts to PDF‑like pipeline).
* Preflight: mime check, virus scan, page count, OCR detect (Tesseract/pdfminer).
* Chunking: semantic (LangChain text splitters), page anchors.
* Embedding: OpenAI/Local model; stored in LanceDB/pgvector.
* Metadata: title, author, tags, project association.

### Q\&A Engine

* **Retriever**: hybrid dense (vector) + sparse (BM25/Elastic) search.
* **Reader**: LLM w/ citations, page refs, footnotes.
* **Chain**: LangChain ConversationalRetrievalChain; memory per thread.
* **Multi‑doc**: cross‑document retrieval; context window merging.
* **Answer formats**: Markdown, HTML, JSON.
* **Guardrails**: always cite; refuse if no answer found.

### Chat & History

* Threads per user/project; roles: user, assistant.
* Thread persistence: DB + vector memory.
* Export chats as Markdown/JSON.
* Tag chats (topic, doc set).

### Collaboration & Governance

* Roles: Owner, Admin, Member, Viewer.
* Sharing: team spaces, doc collections.
* Comments on answers; approval workflow.
* Audit log.

### Integrations & APIs

* Slack bot: `/askdoc` with org/project scope.
* REST/GraphQL API: embed new docs, query, export.
* Webhooks for Q\&A events.
* Optional plugins: Notion, Confluence.

### Analytics

* Usage per doc/project: queries, avg latency, top docs.
* Quality feedback (thumbs up/down, comment).
* Embedding/token spend per project.

### Compliance & Security

* PII/secret scan; retention policies.
* Org‑level encryption keys.
* SOC2/ISO controls for enterprise tier.

---

## 4) Backend Architecture (Extremely Detailed & Deployment‑Ready)

### 4.1 Topology

* **Frontend/BFF:** Next.js 14 (Vercel). Server Actions for presigned uploads, light mutations; SSR for dashboards.
* **API Gateway:** **NestJS (Node 20)**
  REST `/v1` (OpenAPI 3.1), Zod validation, Problem+JSON, RBAC, RLS, Idempotency‑Key, rate limits, Request‑ID.
* **Workers (Python 3.11 + FastAPI microservices)**:
  `ingest-worker` (pdfminer/pymupdf + OCR), `embed-worker` (chunk & embeddings), `qa-worker` (retrieval + LLM chain), `slack-worker` (bot connector), `export-worker` (chat export), `analytics-worker`.
* **Queues/Bus:** NATS (`doc.ingest`, `doc.embed`, `doc.qa`, `doc.export`) or Redis Streams; Celery/RQ orchestrators.
* **Datastores:** Postgres 16 + pgvector; LanceDB/FAISS for high‑perf retrieval; Redis for sessions/jobs; S3/R2 for raw & exports.
* **Observability:** OTel traces, Prometheus/Grafana, Sentry.
* **Secrets:** Cloud Secrets Manager/KMS.

### 4.2 Data Model (Postgres + pgvector)

```sql
-- Tenancy & Identity
CREATE TABLE orgs (
  id UUID PRIMARY KEY, name TEXT NOT NULL, plan TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE users (
  id UUID PRIMARY KEY, org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  email CITEXT UNIQUE NOT NULL, name TEXT, role TEXT DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE memberships (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner','admin','member','viewer')),
  PRIMARY KEY (user_id, org_id)
);

-- Projects & Docs
CREATE TABLE projects (
  id UUID PRIMARY KEY, org_id UUID, name TEXT, description TEXT,
  created_by UUID, created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE documents (
  id UUID PRIMARY KEY, project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT, uri TEXT, mime TEXT, pages INT, status TEXT CHECK (status IN ('uploaded','ingested','embedded','ready','failed')) DEFAULT 'uploaded',
  meta JSONB, created_by UUID, created_at TIMESTAMPTZ DEFAULT now()
);

-- Embeddings
CREATE TABLE chunks (
  id UUID PRIMARY KEY, document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  page INT, content TEXT, embedding VECTOR(1536), meta JSONB
);
CREATE INDEX chunks_embedding_idx ON chunks USING ivfflat (embedding vector_cosine_ops);

-- QA & Threads
CREATE TABLE threads (
  id UUID PRIMARY KEY, project_id UUID, user_id UUID, title TEXT, created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE messages (
  id UUID PRIMARY KEY, thread_id UUID REFERENCES threads(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user','assistant')), content_md TEXT, cites JSONB, created_at TIMESTAMPTZ DEFAULT now()
);

-- Analytics
CREATE TABLE usage_stats (
  id BIGSERIAL PRIMARY KEY, org_id UUID, project_id UUID, document_id UUID,
  queries INT, tokens_used INT, avg_latency_ms INT, period DATE
);

-- Comments & Audit
CREATE TABLE comments (
  id UUID PRIMARY KEY, thread_id UUID, author UUID, anchor JSONB, body TEXT, created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY, org_id UUID, user_id UUID, document_id UUID, action TEXT, target TEXT, meta JSONB, created_at TIMESTAMPTZ DEFAULT now()
);
```

**Invariants**

* `chunks` only created after OCR/ingest; embedding required.
* RLS per org/project.
* `messages.cites` must reference valid doc/page.
* Retention purge enforced by plan.

### 4.3 API Surface (REST `/v1`)

**Projects/Docs**

* `POST /projects` `{name, description}`
* `POST /documents/upload-url` `{mime,name}` → presigned
* `POST /documents` `{project_id, title, uri, mime}`
* `POST /documents/:id/process` → enqueue ingest+embed
* `GET /documents/:id` (status, meta)

**QA/Threads**

* `POST /threads` `{project_id,title}`
* `POST /threads/:id/messages` `{role,content}` → assistant runs retrieval+LLM
* `GET /threads/:id/messages`
* `POST /qa` `{project_id,query}` → answer with cites

**Integrations**

* `POST /slack/install` → OAuth
* `POST /slack/events` (webhook)
* `POST /slack/ask` `{project_id, query}`

**Exports**

* `GET /threads/:id/export?format=md|json|pdf`

**Analytics**

* `GET /projects/:id/usage?from&to`

### 4.4 Pipelines & Workers

**Ingest Pipeline**

1. Download → pdfminer parse → OCR fallback (Tesseract).
2. Extract text per page; store `documents`; raw → S3; text to `chunks` (pre‑embed).

**Embed Pipeline**
3\) LangChain splitter (semantic+page); embed (OpenAI/local) → pgvector/LanceDB; update `chunks`.

**QA Pipeline**
4\) Retrieve topK from vector + BM25; rerank; feed to LLM; generate answer with citations.
5\) Store `messages` in `threads`; citations recorded with page refs.

**Slack Integration**
6\) Slack event → `slack-worker` → map org/project → call QA → reply with snippet + link back.

**Export Pipeline**
7\) Collect `messages`; render Markdown/HTML/PDF; upload S3; signed URL.

**Analytics**
8\) Log tokens, latency; nightly aggregation → `usage_stats`.

### 4.5 Realtime

* WS channels: `doc:{id}:status`, `thread:{id}:messages`, `usage:org:{id}`.
* Presence: who viewing thread; typing indicator.

### 4.6 Caching & Performance

* Redis caches: embeddings LRU; last answers per thread.
* Query dedupe: identical query returns cached answer.
* Streaming responses via SSE for token‑by‑token answers.

### 4.7 Observability

* OTel spans: tags (org, doc\_id, project\_id, query).
* Metrics: ingest latency, embedding throughput, QA latency, Slack response time.
* Alerts: >5% QA fail → notify ops.

### 4.8 Security & Compliance

* TLS/HSTS; signed URLs; encryption at rest.
* Tenant isolation (RLS); audit log.
* PII/secret masking; DSR endpoints.
* SOC2/ISO templates for enterprise.

---

## 5) Frontend Architecture (React 18 + Next.js 14)

### 5.1 Tech Choices

* **UI:** Mantine UI + Tailwind for spacing/tweaks.
* **Editor/Chat:** TipTap for notes; chat bubbles with markdown render.
* **State/Data:** TanStack Query; Zustand for UI.
* **Realtime:** WS/SSE clients.
* **Charts:** Recharts for usage.
* **i18n/A11y:** next‑intl; ARIA roles.

### 5.2 App Structure

```
/app
  /(marketing)/page.tsx
  /(auth)/sign-in/page.tsx
  /(app)/dashboard/page.tsx
  /(app)/projects/page.tsx
  /(app)/projects/[projectId]/documents/page.tsx
  /(app)/documents/upload/page.tsx
  /(app)/threads/[threadId]/page.tsx
  /(app)/analytics/page.tsx
/components
  Uploader/*
  DocumentList/*
  ThreadChat/*
  AnswerCitation/*
  ProjectUsage/*
  SlackConnect/*
  Comments/*
  AnalyticsDash/*
/lib
  api-client.ts
  ws-client.ts
  zod-schemas.ts
  rbac.ts
/store
  useDocStore.ts
  useThreadStore.ts
  useRealtimeStore.ts
```

### 5.3 Key Pages & UX Flows

**Dashboard**

* Tiles: docs uploaded, threads started, queries answered, avg latency.
* Recent Q\&A threads.

**Upload**

* Presigned upload; OCR detect toggle; processing status with progress bar.
* Bulk upload option.

**Project Docs**

* List of documents with status, pages, size; filters by tag/meta.
* Actions: re‑embed, archive, delete.

**Thread Chat**

* Chat interface; markdown answers with footnotes (page refs).
* Collapsible “Sources” panel shows page thumbnails with highlights.
* Export button (MD/JSON/PDF).
* Comment threads inline.

**Analytics**

* Charts: queries/day, tokens spend, latency; top docs by usage.
* Export CSV.

**Integrations**

* Slack connect card; status check; test command.

### 5.4 Component Breakdown (Selected)

* **ThreadChat/Message.tsx**
  Props: `{ role, content, cites }`
  Renders markdown; footnote refs link to `AnswerCitation`.

* **AnswerCitation/Pane.tsx**
  Props: `{ cites }`
  Shows page thumbnails + highlighted snippet; jump to page.

* **Uploader/Dropzone.tsx**
  Props: `{ onUpload }`
  Drag‑and‑drop; progress; virus/OCR toggle.

* **ProjectUsage/Chart.tsx**
  Props: `{ stats }`
  Displays queries, latency, token spend; interactive filters.

* **SlackConnect/Card.tsx**
  Props: `{ connected, onConnect }`
  OAuth button; shows org workspace linked.

### 5.5 Data Fetching & Caching

* Server Components for dashboard snapshots.
* TanStack Query for docs/threads.
* WS push to update chat threads.
* Prefetch: projects → docs → threads.

### 5.6 Validation & Error Handling

* Shared Zod schemas.
* Errors as Problem+JSON (e.g., “File encrypted; cannot parse”).
* Guard: refuse answer if retrieval empty; show “No relevant info found.”

### 5.7 Accessibility & i18n

* Keyboard nav for chat & citations; screen reader alt text for OCR images.
* Localized UI; right‑to‑left layout support.

---

## 6) SDKs & Integration Contracts

**Slack Ask (example)**

```json
{
  "type": "doc.ask",
  "org_id": "...",
  "project_id": "...",
  "query": "What is the warranty period?"
}
```

**REST QA (example)**

```http
POST /qa
{
  "project_id": "...",
  "query": "Summarize section 2.3 of the contract"
}
```

**Export JSON bundle**: `project`, `documents[]`, `chunks[]`, `threads[]`, `messages[]`.

---

## 7) DevOps & Deployment

* **FE:** Vercel.
* **APIs/Workers:** Fly/Render/GKE.
* **DB:** Managed Postgres + pgvector; PITR; read replicas.
* **Vector Store:** LanceDB/FAISS; autoscale cluster.
* **Cache/Queue:** Redis/NATS; DLQ; retries.
* **Storage:** S3/R2; lifecycle purge.
* **CI/CD:** GitHub Actions (lint, typecheck, tests, Docker build, scan, sign, deploy).
* **IaC:** Terraform modules (DB, buckets, secrets, CDN).
* **Envs:** dev/staging/prod.

**Operational SLOs**

* Ingest 100‑page PDF **< 2 min**.
* Query latency **< 3 s p95**.
* QA fail rate **< 2%**.
* WS delivery **< 250 ms p95**.

---

## 8) Testing

* **Unit:** chunk splitter; embed correctness; citation formatting; guardrails.
* **Integration:** upload → ingest → embed → QA → thread persist → Slack ask.
* **Contract:** OpenAPI schemas; Slack event payloads.
* **E2E (Playwright):** upload contract → ask “Termination clause?” → answer with cites → export thread.
* **Load:** ingest burst
