import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=False, env_file=".env", extra="ignore")

    PROJECT_NAME: str = "AgenticRAG-ChatBot API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # GROQ Config
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "qwen/qwen3.8-27b")
    DEFAULT_LLM_MODEL: str = os.getenv("LLM_MODEL", "qwen/qwen3.8-27b")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    AVAILABLE_MODELS: List[str] = [
        "qwen/qwen3.8-27b",
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
        "allam-2-7b"
    ]
    
    # Embedding & Retrieval Config
    EMBED_MODEL: str = os.getenv("EMBED_MODEL", "all-MiniLM-L6-v2")
    DEFAULT_TOP_K: int = 3
    DEFAULT_FETCH_K: int = 20
    DEFAULT_LAMBDA_MMR: float = 0.5
    
    # Vector DB Storage Path
    CHROMA_PERSIST_DIR: str = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
    COLLECTION_NAME: str = "rag_kb"
    
    # Upload storage
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]

    def model_post_init(self, __context):
        if not self.DEFAULT_LLM_MODEL:
            self.DEFAULT_LLM_MODEL = self.LLM_MODEL

settings = Settings()
