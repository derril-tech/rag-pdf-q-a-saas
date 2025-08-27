# Project Plan — RAG PDF Q&A SaaS

## Current Goal
Deliver an MVP: **“Upload PDFs → ingest + embed → query with citations → chat threads with export → Slack integration”**.  
Covers ingestion, embedding, Q&A, threads, and one integration.

## Next 3 Tasks
1. Scaffold monorepo (Next.js FE, NestJS API, Python workers, Postgres/Redis/S3 infra).
2. Define contracts + OpenAPI surface (`/v1`) for projects, documents, chunks, threads, messages, usage.
3. Implement vertical slice: upload PDF → embed → ask question → answer with citations → store in thread.

## Milestones
- Monorepo layout + `.cursor/rules`; CI/CD bootstrap; `.env.example`.
- Gateway `/v1` stubs + OpenAPI; Postgres migrations (orgs/users/projects/docs/threads/etc.); RLS policies.
- Upload + probe (mime/page/virus scan); ingest-worker (pdfminer + OCR fallback).
- Embed-worker: chunking (LangChain), embeddings (OpenAI/local), persist to pgvector/LanceDB.
- QA-worker: hybrid retrieval (vector + BM25), rerank, LLM answer with page cites; messages persisted.
- Threads & messages: chat UI, citations panel, export (MD/JSON/PDF).
- Slack-worker: OAuth connect, `/askdoc` command, Q&A reply with sources.
- Analytics-worker: usage stats (queries, tokens, latency); feedback loop.
- Dashboard, documents list, thread chat page, analytics charts.
- Usage metering & Stripe billing integration.
- Observability: OTEL traces, Prometheus metrics, Sentry error capture.
- Security & compliance: RLS, signed URLs, retention sweeps, audit log.
- Load/chaos tests; HIPAA toggle; production deploy.

## Success Criteria (Launch)
- **Latency:** Ingest 100-page PDF < 2 min; query latency < 3s p95.
- **Reliability:** QA fail rate < 2%; pipeline success ≥ 99.5%.
- **UX:** Answer always cites sources; SSE streaming < 250 ms p95.
- **Adoption:** At least 5 teams successfully running multi-doc projects with Slack integration.
- **Security:** Tenant isolation (RLS), signed URLs, PII masking; SOC2/ISO controls for enterprise tier.
