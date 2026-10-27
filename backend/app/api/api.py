from fastapi import APIRouter
from app.api.routes import documents, chat, config, health

api_router = APIRouter()

api_router.include_router(documents.router, prefix="/documents", tags=["Documents"])
api_router.include_router(chat.router, prefix="/chat", tags=["Chat & Retrieval"])
api_router.include_router(config.router, prefix="/config", tags=["System Configuration"])
api_router.include_router(health.router, prefix="/health", tags=["Health"])
