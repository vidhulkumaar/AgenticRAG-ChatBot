from fastapi import APIRouter
from app.core.config import settings
from app.models.schemas import HealthResponse
from app.services.rag_service import rag_service

router = APIRouter()

@router.get("/", response_model=HealthResponse)
async def health_check():
    stats = rag_service.get_stats()
    return HealthResponse(
        status="healthy",
        version=settings.VERSION,
        total_documents=stats["total_documents"],
        total_chunks=stats["total_chunks"]
    )
