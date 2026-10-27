import os
import io
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.services.rag_service import rag_service

@pytest.fixture(autouse=True)
def clean_kb():
    """Ensure a clean knowledge base for each test."""
    rag_service.clear_all_documents()
    yield
    rag_service.clear_all_documents()

@pytest.fixture
def client():
    return TestClient(app)

# 1. Successful TXT upload using a real multipart file
def test_upload_txt_success(client):
    file_content = b"Agentic RAG utilizes iterative reasoning and MMR retrieval for high precision answers."
    files = [
        ("files", ("agentic_rag.txt", io.BytesIO(file_content), "text/plain"))
    ]
    res = client.post("/api/documents/upload", files=files)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["total_chunks_added"] >= 1
    assert len(data["indexed_documents"]) == 1
    assert data["indexed_documents"][0]["name"] == "agentic_rag.txt"

# 2. Successful upload of supported formats (Markdown and Text)
def test_upload_markdown_success(client):
    md_content = b"# Architecture\n\nFastAPI backend decoupled from Vite React SPA with ChromaDB vector store."
    files = [
        ("files", ("arch.md", io.BytesIO(md_content), "text/markdown"))
    ]
    res = client.post("/api/documents/upload", files=files)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["indexed_documents"][0]["name"] == "arch.md"

# 3. Missing 'files' field
def test_upload_missing_files_field(client):
    files = [
        ("wrong_field", ("test.txt", io.BytesIO(b"content"), "text/plain"))
    ]
    res = client.post("/api/documents/upload", files=files)
    assert res.status_code == 422  # FastAPI validation failure for missing required field

# 4. Empty or unsupported files
def test_upload_empty_file(client):
    files = [
        ("files", ("empty.txt", io.BytesIO(b""), "text/plain"))
    ]
    res = client.post("/api/documents/upload", files=files)
    assert res.status_code == 422
    assert "empty" in res.json()["detail"].lower()

def test_upload_unsupported_file(client):
    files = [
        ("files", ("malicious.exe", io.BytesIO(b"\x00\x01\x02\x03"), "application/octet-stream"))
    ]
    res = client.post("/api/documents/upload", files=files)
    assert res.status_code == 422
    assert "unsupported format" in res.json()["detail"].lower()

# 5. Multiple files in one request
def test_upload_multiple_files(client):
    files = [
        ("files", ("doc1.txt", io.BytesIO(b"Document one discusses vector databases and embeddings."), "text/plain")),
        ("files", ("doc2.txt", io.BytesIO(b"Document two covers LLM prompt engineering and MMR search."), "text/plain"))
    ]
    res = client.post("/api/documents/upload", files=files)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert len(data["indexed_documents"]) == 2
    assert data["total_chunks_added"] >= 2

# 6. Correct document and chunk counts after successful indexing
def test_document_and_chunk_counts(client):
    files = [
        ("files", ("knowledge.txt", io.BytesIO(b"ChromaDB stores vectors persistently and calculates cosine distances."), "text/plain"))
    ]
    upload_res = client.post("/api/documents/upload", files=files)
    assert upload_res.status_code == 200
    uploaded_chunks = upload_res.json()["total_chunks_added"]

    # Check /api/documents/
    docs_res = client.get("/api/documents/")
    assert docs_res.status_code == 200
    docs = docs_res.json()
    assert len(docs) == 1
    assert docs[0]["name"] == "knowledge.txt"

    # Check /api/health/
    health_res = client.get("/api/health/")
    assert health_res.status_code == 200
    health = health_res.json()
    assert health["total_documents"] == 1
    assert health["total_chunks"] == uploaded_chunks

# 7. Embedding failure handling
def test_upload_embedding_failure(client):
    files = [
        ("files", ("error_test.txt", io.BytesIO(b"Some text for embedding failure test."), "text/plain"))
    ]
    with patch.object(rag_service, "compute_embeddings", side_effect=RuntimeError("GPU OOM / Memory limit")):
        res = client.post("/api/documents/upload", files=files)
        assert res.status_code == 422
        assert "processing failed" in res.json()["detail"].lower()

# 8. ChromaDB insertion failure handling
def test_upload_chromadb_failure(client):
    files = [
        ("files", ("chroma_fail.txt", io.BytesIO(b"Testing ChromaDB write exception."), "text/plain"))
    ]
    with patch.object(rag_service.collection, "add", side_effect=Exception("Disk full / I/O error")):
        res = client.post("/api/documents/upload", files=files)
        assert res.status_code == 422
        assert "processing failed" in res.json()["detail"].lower()

# 9. Text snippet direct upload
def test_add_text_snippet(client):
    payload = {
        "text": "Direct text snippet addition to knowledge base.",
        "title": "quick_note"
    }
    res = client.post("/api/documents/text", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["total_chunks_added"] >= 1
    assert "quick_note" in data["indexed_documents"][0]["name"]
