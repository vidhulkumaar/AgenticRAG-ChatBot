from fastapi import APIRouter
from app.core.config import settings
from app.models.schemas import SystemConfigResponse, UpdateConfigRequest
from app.services.rag_service import rag_service

router = APIRouter()

@router.get("/", response_model=SystemConfigResponse)
async def get_config():
    """Get active LLM, embedding model, retrieval parameters, and knowledge base stats."""
    stats = rag_service.get_stats()
    return SystemConfigResponse(
        groq_api_key_configured=rag_service.is_groq_ready,
        current_llm_model=rag_service.current_llm_model,
        available_models=rag_service.get_available_models(),
        embed_model=settings.EMBED_MODEL,
        default_top_k=settings.DEFAULT_TOP_K,
        default_lambda_mmr=settings.DEFAULT_LAMBDA_MMR,
        total_documents=stats["total_documents"],
        total_chunks=stats["total_chunks"]
    )

@router.post("/", response_model=dict)
async def update_config(payload: UpdateConfigRequest):
    """Update runtime configurations such as Groq API key or model."""
    rag_service.update_config(
        groq_api_key=payload.groq_api_key,
        llm_model=payload.llm_model
    )
    return {
        "success": True,
        "message": "Configuration updated successfully",
        "groq_ready": rag_service.is_groq_ready,
        "current_model": rag_service.current_llm_model
    }
