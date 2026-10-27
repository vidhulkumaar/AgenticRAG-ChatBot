import time
import json
from typing import List
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.models.schemas import ChatRequest, ChatResponse, RetrievedChunk
from app.services.rag_service import rag_service

router = APIRouter()

@router.post("/", response_model=ChatResponse)
async def chat_query(payload: ChatRequest):
    """Perform MMR retrieval over indexed documents and generate an answer using Groq LLM."""
    start_time = time.time()
    
    # 1. Retrieve relevant chunks using Maximal Marginal Relevance
    retrieved = rag_service.mmr_retrieve(
        query=payload.message,
        top_k=payload.top_k or 3,
        fetch_k=payload.fetch_k or 20,
        lambda_mmr=payload.lambda_mmr or 0.5
    )

    # 2. Generate answer
    answer = rag_service.generate_answer(
        query=payload.message,
        retrieved=retrieved,
        model=payload.model
    )

    sources = sorted(list(set([c["source"] for c in retrieved])))
    latency_ms = round((time.time() - start_time) * 1000, 2)
    model_used = payload.model or rag_service.current_llm_model

    return ChatResponse(
        answer=answer,
        sources=sources,
        retrieved_chunks=[RetrievedChunk(**c) for c in retrieved],
        model_used=model_used,
        latency_ms=latency_ms
    )

@router.post("/stream")
async def chat_query_stream(payload: ChatRequest):
    """Stream answer token-by-token using Server-Sent Events (SSE)."""
    # 1. Retrieve relevant chunks
    retrieved = rag_service.mmr_retrieve(
        query=payload.message,
        top_k=payload.top_k or 3,
        fetch_k=payload.fetch_k or 20,
        lambda_mmr=payload.lambda_mmr or 0.5
    )

    sources = sorted(list(set([c["source"] for c in retrieved])))
    retrieved_formatted = [{"id": c.get("id"), "text": c["text"], "source": c["source"], "score": c.get("score")} for c in retrieved]

    def event_generator():
        # First send metadata (sources and chunks)
        metadata_event = {
            "type": "metadata",
            "sources": sources,
            "retrieved_chunks": retrieved_formatted,
            "model_used": payload.model or rag_service.current_llm_model
        }
        yield f"data: {json.dumps(metadata_event)}\n\n"

        # Stream answer chunks
        token_stream = rag_service.generate_answer_stream(
            query=payload.message,
            retrieved=retrieved,
            model=payload.model
        )

        for token in token_stream:
            chunk_event = {"type": "token", "content": token}
            yield f"data: {json.dumps(chunk_event)}\n\n"

        # End of stream event
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
