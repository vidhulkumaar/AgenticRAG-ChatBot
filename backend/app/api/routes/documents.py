from typing import List
import time
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from app.models.schemas import (
    DocumentInfo,
    TextInputRequest,
    DocumentUploadResponse,
    DocumentDeleteResponse
)
from app.services.document_service import DocumentService
from app.services.rag_service import rag_service

router = APIRouter()

@router.get("/", response_model=List[DocumentInfo])
async def list_documents():
    """Retrieve all documents currently indexed in the knowledge base."""
    docs = rag_service.get_all_documents()
    return docs

@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_documents(files: List[UploadFile] = File(...)):
    """Upload one or more files (PDF, TXT, MD, DOCX) and index them into ChromaDB."""
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files provided"
        )

    indexed_docs = []
    total_chunks = 0

    for file in files:
        try:
            content = await file.read()
            parsed = DocumentService.extract_text(file.filename, content)
            if not parsed:
                continue

            size_str = DocumentService.format_size(len(content))
            file_type = file.content_type or parsed.get("extension", "unknown")

            res = rag_service.embed_and_store(
                filename=file.filename,
                doc_text=parsed["text"],
                file_size=size_str,
                file_type=file_type
            )

            if res["doc_info"]:
                indexed_docs.append(res["doc_info"])
                total_chunks += res["chunks_added"]
        except Exception as e:
            print(f"Error processing file {file.filename}: {e}")

    if not indexed_docs:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not extract valid text from any of the uploaded files. Supported formats: PDF, TXT, MD, DOCX."
        )

    return DocumentUploadResponse(
        success=True,
        message=f"Successfully indexed {len(indexed_docs)} document(s) with {total_chunks} chunks.",
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

    res = rag_service.embed_and_store(
        filename=filename,
        doc_text=clean_text,
        file_size=size_str,
        file_type="text/plain"
    )

    if not res["doc_info"]:
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
