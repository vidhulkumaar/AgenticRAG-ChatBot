from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# --- Document Schemas ---
class DocumentInfo(BaseModel):
    id: str
    name: str
    size: str
    type: str
    chunks: int
    created_at: str

class TextInputRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Raw text to index into knowledge base")
    title: Optional[str] = Field(None, description="Optional title or label for the snippet")

class DocumentUploadResponse(BaseModel):
    success: bool
    message: str
    indexed_documents: List[DocumentInfo]
    total_chunks_added: int

class DocumentDeleteResponse(BaseModel):
    success: bool
    message: str
    deleted_filename: str

# --- Chat & Retrieval Schemas ---
class RetrievedChunk(BaseModel):
    id: Optional[str] = None
    text: str
    source: str
    score: Optional[float] = None

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User question or prompt")
    top_k: Optional[int] = Field(3, ge=1, le=10, description="Top K relevant chunks to return")
    fetch_k: Optional[int] = Field(20, ge=5, le=50, description="Initial pool size for MMR")
    lambda_mmr: Optional[float] = Field(0.5, ge=0.0, le=1.0, description="MMR diversity trade-off (1=relevance, 0=diversity)")
    model: Optional[str] = Field(None, description="Groq LLM model name")

class ChatResponse(BaseModel):
    answer: str
    sources: List[str]
    retrieved_chunks: List[RetrievedChunk]
    model_used: str
    latency_ms: float

# --- Config & System Schemas ---
class SystemConfigResponse(BaseModel):
    groq_api_key_configured: bool
    current_llm_model: str
    available_models: List[str]
    embed_model: str
    default_top_k: int
    default_lambda_mmr: float
    total_documents: int
    total_chunks: int

class UpdateConfigRequest(BaseModel):
    groq_api_key: Optional[str] = None
    llm_model: Optional[str] = None
    top_k: Optional[int] = None
    lambda_mmr: Optional[float] = None

class HealthResponse(BaseModel):
    status: str
    version: str
    total_documents: int
    total_chunks: int
