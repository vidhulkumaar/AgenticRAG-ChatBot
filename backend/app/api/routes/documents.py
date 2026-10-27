from typing import List
import time
import os
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from starlette.concurrency import run_in_threadpool
from app.models.schemas import (
    DocumentInfo,
    TextInputRequest,
    DocumentUploadResponse,
    DocumentDeleteResponse
)
from app.services.document_service import DocumentService
from app.services.rag_service import rag_service

router = APIRouter()

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB limit per file (free tier host constraint)
ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md", ".json", ".csv", ".docx"}

@router.get("/", response_model=List[DocumentInfo])
async def list_documents():
    """Retrieve all documents currently indexed in the knowledge base."""
    docs = rag_service.get_all_documents()
    return docs

@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_documents(files: List[UploadFile] = File(...)):
    """Upload one or more files (PDF, TXT, MD, DOCX - max 10MB) and index them into ChromaDB."""
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files provided in upload request."
        )

    indexed_docs = []
    total_chunks = 0
    errors = []

    for file in files:
        if not file.filename:
            continue

        ext = os.path.splitext(file.filename)[-1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            errors.append(f"'{file.filename}': Unsupported format. Supported: PDF, TXT, MD, DOCX, CSV, JSON.")
            continue

        try:
            content = await file.read()
            if len(content) == 0:
                errors.append(f"'{file.filename}': File is empty.")
                continue

            if len(content) > MAX_FILE_SIZE:
                errors.append(f"'{file.filename}': File exceeds 10MB limit. Only files up to 10 MB are allowed on free tier hosting.")
                continue

            # Run text extraction in threadpool
            parsed = await run_in_threadpool(DocumentService.extract_text, file.filename, content)
            if not parsed or not parsed.get("text"):
                errors.append(f"'{file.filename}': No extractable text found.")
                continue

            size_str = DocumentService.format_size(len(content))
            file_type = file.content_type or parsed.get("extension", "unknown")

            # Run heavy chunking, embedding, and vector storage in threadpool to keep event loop responsive
            res = await run_in_threadpool(
                rag_service.embed_and_store,
                filename=file.filename,
                doc_text=parsed["text"],
                file_size=size_str,
                file_type=file_type
            )

            if res.get("doc_info"):
                indexed_docs.append(res["doc_info"])
                total_chunks += res["chunks_added"]

        except Exception as e:
            print(f"[ERROR] Upload processing failure for '{file.filename}': {e}")
            errors.append(f"'{file.filename}': Processing failed ({str(e)})")

    if not indexed_docs:
        err_msg = " | ".join(errors) if errors else "Could not extract valid text from any uploaded files."
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=err_msg
        )

    success_msg = f"Successfully indexed {len(indexed_docs)} document(s) with {total_chunks} chunks."
    if errors:
        success_msg += f" (Warnings: {'; '.join(errors)})"

    return DocumentUploadResponse(
        success=True,
        message=success_msg,
        indexed_documents=indexed_docs,
        total_chunks_added=total_chunks
    )

@router.post("/text", response_model=DocumentUploadResponse)
async def add_text_snippet(payload: TextInputRequest):
    """Add a raw text snippet directly to the knowledge base."""
    clean_text = payload.text.strip()
    if not clean_text:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    timestamp = time.strftime("%Y%m%d_%H%M%S")
    title_slug = payload.title.strip().replace(" ", "_") if payload.title else f"note_{timestamp}"
    filename = f"{title_slug}.txt"
    size_str = DocumentService.format_size(len(clean_text.encode("utf-8")))

    try:
        res = await run_in_threadpool(
            rag_service.embed_and_store,
            filename=filename,
            doc_text=clean_text,
            file_size=size_str,
            file_type="text/plain"
        )
    except Exception as e:
        print(f"[ERROR] Failed to embed snippet '{filename}': {e}")
        raise HTTPException(status_code=500, detail=f"Failed to embed and store snippet: {str(e)}")

    if not res.get("doc_info"):
        raise HTTPException(status_code=500, detail="Failed to chunk and embed text snippet.")

    return DocumentUploadResponse(
        success=True,
        message=f"Added snippet '{filename}' with {res['chunks_added']} chunks to Knowledge Base.",
        indexed_documents=[res["doc_info"]],
        total_chunks_added=res["chunks_added"]
    )

@router.delete("/{filename}", response_model=DocumentDeleteResponse)
async def delete_document(filename: str):
    """Delete a document and all associated vector embeddings."""
    success = rag_service.delete_document(filename)
    if not success:
        raise HTTPException(status_code=404, detail=f"Document '{filename}' not found.")

    return DocumentDeleteResponse(
        success=True,
        message=f"Document '{filename}' deleted from knowledge base.",
        deleted_filename=filename
    )

@router.delete("/", response_model=dict)
async def clear_all_documents():
    """Clear all documents and reset the vector database."""
    rag_service.clear_all_documents()
    return {"success": True, "message": "Knowledge base wiped successfully."}
