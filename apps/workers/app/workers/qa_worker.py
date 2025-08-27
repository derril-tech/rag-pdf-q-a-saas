# Created automatically by Cursor AI (2025-01-27)

import asyncio
import time
from typing import Dict, Any, List

import nats
from nats.aio.client import Client as NATS
import redis.asyncio as redis
import openai

from app.core.config import settings
from app.core.logging import WorkerLogger
from app.models.jobs import QAJob


class QAWorker:
    """Worker for processing QA requests"""
    
    def __init__(self):
        self.name = "qa"
        self.logger = WorkerLogger(self.name)
        self.is_running = False
        self.processed_jobs = 0
        self.failed_jobs = 0
        
        # External services
        self.nats_client: NATS = None
        self.redis_client: redis.Redis = None
        
        # OpenAI client
        self.openai_client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    
    async def start(self) -> None:
        """Start the QA worker"""
        self.logger.log_worker_start()
        self.is_running = True
        
        # Initialize connections
        await self._init_connections()
        
        # Start processing loop
        while self.is_running:
            try:
                await self._process_jobs()
                await asyncio.sleep(1)
            except Exception as e:
                self.logger.logger.error(f"Error in QA worker: {e}")
                await asyncio.sleep(5)
    
    async def stop(self) -> None:
        """Stop the QA worker"""
        self.logger.log_worker_stop()
        self.is_running = False
        
        if self.nats_client:
            await self.nats_client.close()
        if self.redis_client:
            await self.redis_client.close()
    
    async def _init_connections(self) -> None:
        """Initialize external service connections"""
        # Connect to NATS
        self.nats_client = nats.NATS()
        await self.nats_client.connect(settings.NATS_URL)
        
        # Connect to Redis
        self.redis_client = redis.from_url(settings.REDIS_URL)
    
    async def _process_jobs(self) -> None:
        """Process QA jobs from NATS"""
        try:
            # Subscribe to QA jobs
            subscription = await self.nats_client.subscribe("jobs.qa")
            
            async for msg in subscription.messages:
                try:
                    job_data = msg.data.decode()
                    job = QAJob.parse_raw(job_data)
                    
                    await self._process_qa_job(job)
                    
                    # Acknowledge message
                    await msg.ack()
                    
                except Exception as e:
                    self.logger.log_job_error(job.query, e)
                    self.failed_jobs += 1
                    await msg.nak()
        
        except Exception as e:
            self.logger.logger.error(f"Error processing jobs: {e}")
    
    async def _process_qa_job(self, job: QAJob) -> None:
        """Process a single QA job"""
        start_time = time.time()
        job_id = f"qa_{int(start_time)}"
        
        self.logger.log_job_start(job_id, "qa", query=job.query)
        
        try:
            # Retrieve relevant chunks
            chunks = await self._retrieve_chunks(job)
            
            # Rerank results
            ranked_chunks = await self._rerank_chunks(job.query, chunks)
            
            # Generate answer
            answer = await self._generate_answer(job.query, ranked_chunks, job.temperature)
            
            # Create citations
            citations = self._create_citations(ranked_chunks)
            
            # Store result
            result = {
                "answer": answer,
                "citations": citations,
                "metadata": {
                    "chunks_retrieved": len(chunks),
                    "chunks_used": len(ranked_chunks),
                    "model": settings.OPENAI_MODEL,
                }
            }
            
            # Cache result
            await self._cache_result(job_id, result)
            
            duration = time.time() - start_time
            self.logger.log_job_success(job_id, duration, query=job.query)
            self.processed_jobs += 1
            
        except Exception as e:
            self.logger.log_job_error(job_id, e, query=job.query)
            raise
    
    async def _retrieve_chunks(self, job: QAJob) -> List[Dict[str, Any]]:
        """Retrieve relevant chunks using hybrid search"""
        try:
            # Vector search
            vector_results = await self._vector_search(job.query, job.max_results * 2)
            
            # BM25 search (fallback)
            bm25_results = await self._bm25_search(job.query, job.max_results * 2)
            
            # Combine and deduplicate results
            combined_results = self._combine_results(vector_results, bm25_results)
            
            return combined_results[:job.max_results]
            
        except Exception as e:
            raise Exception(f"Failed to retrieve chunks: {e}")
    
    async def _vector_search(self, query: str, limit: int) -> List[Dict[str, Any]]:
        """Perform vector search"""
        try:
            # Generate query embedding
            response = await self.openai_client.embeddings.create(
                model=settings.OPENAI_EMBEDDING_MODEL,
                input=query
            )
            query_embedding = response.data[0].embedding
            
            # Search in database (this would be implemented in your database service)
            # For now, return empty list
            return []
            
        except Exception as e:
            raise Exception(f"Vector search failed: {e}")
    
    async def _bm25_search(self, query: str, limit: int) -> List[Dict[str, Any]]:
        """Perform BM25 search"""
        try:
            # This would be implemented with Elasticsearch or similar
            # For now, return empty list
            return []
            
        except Exception as e:
            raise Exception(f"BM25 search failed: {e}")
    
    def _combine_results(self, vector_results: List[Dict[str, Any]], bm25_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Combine and deduplicate search results"""
        # Simple combination - in practice, you might want more sophisticated ranking
        combined = vector_results + bm25_results
        
        # Deduplicate by chunk ID
        seen = set()
        unique_results = []
        
        for result in combined:
            chunk_id = result.get("chunk_id")
            if chunk_id not in seen:
                seen.add(chunk_id)
                unique_results.append(result)
        
        return unique_results
    
    async def _rerank_chunks(self, query: str, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Rerank chunks using cross-encoder"""
        try:
            # This would use a cross-encoder model for reranking
            # For now, return chunks as-is
            return chunks
            
        except Exception as e:
            raise Exception(f"Reranking failed: {e}")
    
    async def _generate_answer(self, query: str, chunks: List[Dict[str, Any]], temperature: float) -> str:
        """Generate answer using LLM"""
        try:
            # Prepare context from chunks
            context = self._prepare_context(chunks)
            
            # Create prompt
            prompt = self._create_prompt(query, context)
            
            # Generate answer
            response = await self.openai_client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that answers questions based on the provided context. Always cite your sources."},
                    {"role": "user", "content": prompt}
                ],
                temperature=temperature,
                max_tokens=1000,
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            raise Exception(f"Failed to generate answer: {e}")
    
    def _prepare_context(self, chunks: List[Dict[str, Any]]) -> str:
        """Prepare context from chunks"""
        context_parts = []
        
        for i, chunk in enumerate(chunks):
            context_parts.append(f"Source {i+1}:\n{chunk.get('content', '')}")
        
        return "\n\n".join(context_parts)
    
    def _create_prompt(self, query: str, context: str) -> str:
        """Create prompt for LLM"""
        return f"""Based on the following context, answer the question. If the answer cannot be found in the context, say so.

Context:
{context}

Question: {query}

Answer:"""
    
    def _create_citations(self, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Create citations from chunks"""
        citations = []
        
        for chunk in chunks:
            citation = {
                "document_id": chunk.get("document_id"),
                "page_number": chunk.get("page_number", 0),
                "chunk_index": chunk.get("chunk_index", 0),
                "content": chunk.get("content", ""),
                "score": chunk.get("score", 0.0),
            }
            citations.append(citation)
        
        return citations
    
    async def _cache_result(self, job_id: str, result: Dict[str, Any]) -> None:
        """Cache QA result"""
        try:
            # Cache in Redis for 1 hour
            await self.redis_client.setex(
                f"qa_result:{job_id}",
                3600,  # 1 hour
                str(result)
            )
        except Exception as e:
            self.logger.logger.warning(f"Failed to cache result: {e}")
