import os
import json
import time
import uuid
from typing import List, Dict, Any, Optional, Generator
import numpy as np
import chromadb
from groq import Groq
from sentence_transformers import SentenceTransformer

from app.core.config import settings

DEPRECATED_MODEL_MAP = {
    "mixtral-8x7b-32768": "qwen/qwen3.8-27b",
    "llama-3.1-70b-versatile": "openai/gpt-oss-120b",
    "llama-3.1-8b-instant": "openai/gpt-oss-20b",
    "llama-3.3-70b-versatile": "qwen/qwen3.8-27b",
    "gemma2-9b-it": "qwen/qwen3.8-27b",
}

class RAGService:
    def __init__(self):
        self._groq_api_key = settings.GROQ_API_KEY
        self._llm_model = self.resolve_model(settings.DEFAULT_LLM_MODEL)
        self._embed_model_name = settings.EMBED_MODEL
        self._embed_model: Optional[SentenceTransformer] = None
        self._groq_client: Optional[Groq] = None
        
        # Init ChromaDB persistent client
        os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)
        self.chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIR)
        self.collection = self.chroma_client.get_or_create_collection(
            name=settings.COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"}
        )
        
        # Document registry file path
        self.registry_file = os.path.join(settings.CHROMA_PERSIST_DIR, "documents_meta.json")
        self.docs_registry: Dict[str, Dict[str, Any]] = self._load_registry()

        # Initialize Groq client if key exists
        if self._groq_api_key:
            try:
                self._groq_client = Groq(api_key=self._groq_api_key)
            except Exception as e:
                print(f"Warning: Failed to initialize Groq client: {e}")

    def resolve_model(self, model: Optional[str] = None) -> str:
        """Resolve model name, replacing deprecated/decommissioned models with active equivalents."""
        chosen = model.strip() if (model and model.strip()) else getattr(self, "_llm_model", "qwen/qwen3.8-27b")
        if chosen in DEPRECATED_MODEL_MAP:
            target = DEPRECATED_MODEL_MAP[chosen]
            print(f"[INFO] Model '{chosen}' is deprecated/decommissioned. Auto-mapped to '{target}'.")
            return target
        return chosen

    def get_available_models(self) -> List[str]:
        """Dynamically fetch supported chat models from Groq or return settings default."""
        if self._groq_client:
            try:
                models = self._groq_client.models.list()
                valid = [
                    m.id for m in models.data
                    if m.active and not m.id.startswith("whisper") and "prompt-guard" not in m.id
                ]
                if valid:
                    return sorted(valid)
            except Exception as e:
                print(f"Warning: Failed to query Groq model list: {e}")
        return settings.AVAILABLE_MODELS

    def _load_registry(self) -> Dict[str, Dict[str, Any]]:
        """Load document metadata registry from disk."""
        if os.path.exists(self.registry_file):
            try:
                with open(self.registry_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error loading document registry: {e}")
        return {}

    def _save_registry(self):
        """Save document metadata registry to disk."""
        try:
            with open(self.registry_file, "w", encoding="utf-8") as f:
                json.dump(self.docs_registry, f, indent=2)
        except Exception as e:
            print(f"Error saving document registry: {e}")

    def get_embed_model(self) -> SentenceTransformer:
        """Lazy load SentenceTransformer embedding model."""
        if self._embed_model is None:
            self._embed_model = SentenceTransformer(self._embed_model_name)
        return self._embed_model

    def update_config(self, groq_api_key: Optional[str] = None, llm_model: Optional[str] = None):
        """Update runtime API key or LLM model."""
        if groq_api_key is not None and groq_api_key.strip():
            self._groq_api_key = groq_api_key.strip()
            self._groq_client = Groq(api_key=self._groq_api_key)
        if llm_model is not None and llm_model.strip():
            self._llm_model = self.resolve_model(llm_model.strip())

    @property
    def is_groq_ready(self) -> bool:
        return bool(self._groq_client and self._groq_api_key)

    @property
    def current_llm_model(self) -> str:
        return self._llm_model

    # ── Chunking ──────────────────────────────────────────
    def _fallback_chunking(self, text: str) -> List[str]:
        """Heuristic chunking based on paragraphs and sentence groups."""
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        chunks = []
        current_chunk = []
        current_len = 0

        for p in paragraphs:
            words = p.split()
            if current_len + len(words) > 220 and current_chunk:
                chunks.append(" ".join(current_chunk))
                current_chunk = []
                current_len = 0
            current_chunk.append(p)
            current_len += len(words)

        if current_chunk:
            chunks.append(" ".join(current_chunk))
        return chunks if chunks else [text]

    def agentic_chunk(self, doc_text: str, filename: str) -> List[Dict[str, Any]]:
        """Split document into meaningful semantic chunks via LLM or robust fallback."""
        chunks_text: List[str] = []
        
        # If text is very long, chunk in batches of ~4500 characters
        BATCH_SIZE = 4500
        text_slices = []
        if len(doc_text) > BATCH_SIZE:
            start = 0
            while start < len(doc_text):
                end = min(start + BATCH_SIZE, len(doc_text))
                # Break at newline if possible
                if end < len(doc_text):
                    last_newline = doc_text.rfind("\n", start, end)
                    if last_newline != -1 and last_newline > start + 2000:
                        end = last_newline
                text_slices.append(doc_text[start:end].strip())
                start = end
        else:
            text_slices = [doc_text]

        for s_idx, slice_text in enumerate(text_slices):
            if not slice_text:
                continue

            if self.is_groq_ready:
                prompt = f"""You are a document chunking expert.
Split the following text into meaningful, self-contained chunks.
Each chunk should:
- Cover ONE complete idea or topic
- Be readable and meaningful on its own
- Not be too short (min 2-3 sentences) or too long (max ~200 words)

Return ONLY a valid JSON array of strings. Do not include markdown codeblocks or any additional explanation.

Text:
{slice_text}
"""
                try:
                    response = self._groq_client.chat.completions.create(
                        model=self._llm_model,
                        messages=[{"role": "user", "content": prompt}],
                        temperature=0.0,
                        max_tokens=4096
                    )
                    raw = response.choices[0].message.content.strip()
                    if "```" in raw:
                        # Extract content inside markdown fences
                        parts = raw.split("```")
                        for part in parts:
                            cleaned = part.replace("json", "").strip()
                            if cleaned.startswith("[") and cleaned.endswith("]"):
                                raw = cleaned
                                break
                    parsed = json.loads(raw)
                    if isinstance(parsed, list):
                        chunks_text.extend([c.strip() for c in parsed if isinstance(c, str) and c.strip()])
                    else:
                        chunks_text.extend(self._fallback_chunking(slice_text))
                except Exception as e:
                    print(f"Agentic chunking failed on slice {s_idx}, using fallback: {e}")
                    chunks_text.extend(self._fallback_chunking(slice_text))
            else:
                chunks_text.extend(self._fallback_chunking(slice_text))

        # Build chunk metadata
        result = []
        for i, chunk in enumerate(chunks_text):
            chunk_clean = chunk.strip()
            if chunk_clean:
                chunk_id = f"{filename}_chunk_{i}_{uuid.uuid4().hex[:6]}"
                result.append({
                    "id": chunk_id,
                    "text": chunk_clean,
                    "source": filename,
                    "chunk_index": i
                })
        return result

    # ── Embed & Storage ───────────────────────────────────
    def embed_and_store(self, filename: str, doc_text: str, file_size: str, file_type: str) -> Dict[str, Any]:
        """Chunk, embed, and store document in ChromaDB and registry."""
        chunks = self.agentic_chunk(doc_text, filename)
        if not chunks:
            return {"chunks_added": 0, "doc_info": None}

        texts = [c["text"] for c in chunks]
        ids = [c["id"] for c in chunks]
        metadatas = [{"source": c["source"], "chunk_index": c["chunk_index"]} for c in chunks]

        # Calculate embeddings
        embed_model = self.get_embed_model()
        embeddings = embed_model.encode(texts).tolist()

        # Insert into ChromaDB
        self.collection.add(
            ids=ids,
            documents=texts,
            embeddings=embeddings,
            metadatas=metadatas
        )

        doc_info = {
            "id": str(uuid.uuid4()),
            "name": filename,
            "size": file_size,
            "type": file_type,
            "chunks": len(chunks),
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
        }

        self.docs_registry[filename] = doc_info
        self._save_registry()

        return {
            "chunks_added": len(chunks),
            "doc_info": doc_info
        }

    def delete_document(self, filename: str) -> bool:
        """Delete all chunks for a document from ChromaDB and registry."""
        try:
            # Query all chunk ids with this source metadata
            results = self.collection.get(where={"source": filename})
            if results and results["ids"]:
                self.collection.delete(ids=results["ids"])

            if filename in self.docs_registry:
                del self.docs_registry[filename]
                self._save_registry()
            return True
        except Exception as e:
            print(f"Error deleting document {filename}: {e}")
            return False

    def clear_all_documents(self):
        """Wipe the entire collection and registry."""
        try:
            self.chroma_client.delete_collection(settings.COLLECTION_NAME)
            self.collection = self.chroma_client.get_or_create_collection(
                name=settings.COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"}
            )
            self.docs_registry = {}
            self._save_registry()
            return True
        except Exception as e:
            print(f"Error clearing collection: {e}")
            return False

    def get_all_documents(self) -> List[Dict[str, Any]]:
        """Return list of all registered documents."""
        return list(self.docs_registry.values())

    def get_stats(self) -> Dict[str, Any]:
        """Return knowledge base statistics."""
        return {
            "total_documents": len(self.docs_registry),
            "total_chunks": self.collection.count()
        }

    # ── Retrieval (MMR) ───────────────────────────────────
    def mmr_retrieve(self, query: str, top_k: int = 3, fetch_k: int = 20, lambda_mmr: float = 0.5) -> List[Dict[str, Any]]:
        """Maximal Marginal Relevance retrieval for diverse and relevant chunks."""
        count = self.collection.count()
        if count == 0:
            return []

        embed_model = self.get_embed_model()
        query_vec = embed_model.encode([query])[0]

        n_results = min(fetch_k, count)
        results = self.collection.query(
            query_embeddings=[query_vec.tolist()],
            n_results=n_results,
            include=["documents", "embeddings", "metadatas"]
        )

        if not results["documents"] or not results["documents"][0]:
            return []

        docs_list = results["documents"][0]
        embeds = np.array(results["embeddings"][0])
        metas = results["metadatas"][0]
        ids = results["ids"][0]

        # Calculate MMR
        selected_indices = []
        remaining = list(range(len(docs_list)))

        # Normalize query vector
        query_norm = np.linalg.norm(query_vec)
        if query_norm > 0:
            q_vec_norm = query_vec / query_norm
        else:
            q_vec_norm = query_vec

        # Normalize candidate embeddings
        embed_norms = np.linalg.norm(embeds, axis=1, keepdims=True)
        embed_norms[embed_norms == 0] = 1.0
        normalized_embeds = embeds / embed_norms

        k_limit = min(top_k, len(docs_list))
        for _ in range(k_limit):
            if not remaining:
                break

            relevance = np.dot(normalized_embeds[remaining], q_vec_norm)

            if selected_indices:
                sim = np.max(
                    np.dot(normalized_embeds[remaining], normalized_embeds[selected_indices].T),
                    axis=1
                )
            else:
                sim = np.zeros(len(remaining))

            scores = lambda_mmr * relevance - (1 - lambda_mmr) * sim
            best_idx = remaining[int(np.argmax(scores))]
            selected_indices.append(best_idx)
            remaining.remove(best_idx)

        selected_chunks = []
        for idx in selected_indices:
            selected_chunks.append({
                "id": ids[idx],
                "text": docs_list[idx],
                "source": metas[idx].get("source", "Unknown"),
                "score": float(np.dot(normalized_embeds[idx], q_vec_norm))
            })

        return selected_chunks

    # ── Answer Generation ─────────────────────────────────
    def generate_answer(self, query: str, retrieved: List[Dict[str, Any]], model: Optional[str] = None) -> str:
        """Generate answer using Groq LLM with context from MMR retrieval."""
        if not retrieved:
            return "❌ No relevant chunks found in the knowledge base. Please upload and index documents first."

        if not self.is_groq_ready:
            return "⚠️ GROQ_API_KEY is not configured. Please set your Groq API key in Settings or in the .env file."

        context = "\n\n".join([f"[Source: {c['source']}]\n{c['text']}" for c in retrieved])
        prompt = f"""You are an advanced Agentic RAG assistant. Answer the user's question accurately using ONLY the context provided below.
If the answer is not contained in the context, explicitly say: "I don't have enough information in the provided knowledge base to answer this question."
Provide a well-structured, clear answer with bullet points or formatted text where appropriate.

Context:
{context}

Question: {query}

Answer:"""

        target_model = self.resolve_model(model)

        try:
            response = self._groq_client.chat.completions.create(
                model=target_model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=1024
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            return f"Error contacting Groq LLM ({target_model}): {str(e)}"

    def generate_answer_stream(self, query: str, retrieved: List[Dict[str, Any]], model: Optional[str] = None) -> Generator[str, None, None]:
        """Stream answer tokens from Groq LLM for real-time response rendering."""
        if not retrieved:
            yield "❌ No relevant chunks found in the knowledge base. Please upload and index documents first."
            return

        if not self.is_groq_ready:
            yield "⚠️ GROQ_API_KEY is not configured. Please set your Groq API key in Settings or in the .env file."
            return

        context = "\n\n".join([f"[Source: {c['source']}]\n{c['text']}" for c in retrieved])
        prompt = f"""You are an advanced Agentic RAG assistant. Answer the user's question accurately using ONLY the context provided below.
If the answer is not contained in the context, explicitly say: "I don't have enough information in the provided knowledge base to answer this question."
Provide a well-structured, clear answer with bullet points or formatted text where appropriate.

Context:
{context}

Question: {query}

Answer:"""

        target_model = self.resolve_model(model)

        try:
            stream = self._groq_client.chat.completions.create(
                model=target_model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=1024,
                stream=True
            )
            for chunk in stream:
                delta = getattr(chunk.choices[0].delta, "content", None)
                if delta:
                    yield delta
        except Exception as e:
            yield f"\n[Error streaming from Groq: {str(e)}]"

rag_service = RAGService()
