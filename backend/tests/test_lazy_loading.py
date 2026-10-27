import os
import io
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.rag_service import rag_service

@pytest.fixture(autouse=True)
def reset_service_state():
    """Ensure clean state for lazy-loading tests."""
    # Reset model to None to simulate fresh application startup
    rag_service._embed_model = None
    rag_service._embed_backend = None
    rag_service.clear_all_documents()
    yield
    rag_service.clear_all_documents()
    rag_service._embed_model = None
    rag_service._embed_backend = None

def test_startup_does_not_load_embedding_model():
    """Verify that starting FastAPI and accessing health, documents, and config endpoints
    does NOT load the heavy embedding model into memory."""
    with TestClient(app) as client:
        # Embedding model must be None before any requests
        assert rag_service.is_embedding_model_loaded is False
        assert rag_service._embed_model is None

        # 1. Health endpoint
        res = client.get("/api/health/")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert rag_service.is_embedding_model_loaded is False, "Health check should not load embedding model"

        # 2. Config endpoint
        res = client.get("/api/config/")
        assert res.status_code == 200
        assert rag_service.is_embedding_model_loaded is False, "Config check should not load embedding model"

        # 3. Documents list endpoint
        res = client.get("/api/documents/")
        assert res.status_code == 200
        assert rag_service.is_embedding_model_loaded is False, "Listing documents should not load embedding model"

def test_upload_initializes_embedding_model_on_demand():
    """Verify that uploading a document triggers lazy initialization of the embedding model."""
    with TestClient(app) as client:
        assert rag_service.is_embedding_model_loaded is False

        # Post a document upload
        file_content = b"Render deployment memory optimization via lazy model loading and ONNX Runtime."
        files = [
            ("files", ("lazy_test.txt", io.BytesIO(file_content), "text/plain"))
        ]
        res = client.post("/api/documents/upload", files=files)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["total_chunks_added"] >= 1

        # Now the model MUST be loaded and cached
        assert rag_service.is_embedding_model_loaded is True
        assert rag_service._embed_model is not None
        model_instance = rag_service._embed_model

        # Subsequent embedding calls reuse the exact same cached instance
        rag_service.compute_embeddings(["Second query string"])
        assert rag_service._embed_model is model_instance

def test_thread_pool_and_memory_environment_limits():
    """Verify thread limit environment variables are set to prevent multi-core memory blowup."""
    assert os.environ.get("OMP_NUM_THREADS") == "1"
    assert os.environ.get("MKL_NUM_THREADS") == "1"
    assert os.environ.get("TOKENIZERS_PARALLELISM") == "false"
