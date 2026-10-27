import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.api import api_router
from app.services.rag_service import rag_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    print(f"[INFO] Starting {settings.PROJECT_NAME} v{settings.VERSION}...")
    print(f"[INFO] ChromaDB directory: {settings.CHROMA_PERSIST_DIR}")
    print(f"[INFO] Default LLM Model: {settings.DEFAULT_LLM_MODEL}")
    print(f"[INFO] Groq configured: {rag_service.is_groq_ready}")
    
    # Pre-warm embedding model during startup to ensure sub-second response on uploads
    try:
        print("[INFO] Pre-warming embedding model...")
        rag_service.prewarm_embedding_model()
        print("[INFO] Embedding model ready.")
    except Exception as e:
        print(f"[WARNING] Non-critical warning during embedding pre-warm: {e}")

    yield
    # Shutdown actions
    print("[INFO] Shutting down backend services...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Full-featured FastAPI backend for AgenticRAG-ChatBot featuring MMR Retrieval and Groq LLM generation",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Configure CORS for frontend access (Vite dev server, Vercel, Netlify, custom domain)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all API routes under /api
app.include_router(api_router, prefix=settings.API_V1_STR)

# Mount Static Web App if static directory exists
static_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
if os.path.exists(static_path):
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=static_path, html=True), name="static")
else:
    @app.get("/")
    def root():
        return {
            "message": f"Welcome to {settings.PROJECT_NAME}",
            "version": settings.VERSION,
            "docs": "/docs",
            "api_v1": settings.API_V1_STR,
            "status": "online"
        }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
