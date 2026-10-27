# 🧠 AgenticRAG-ChatBot (Fullstack React + FastAPI)

A production-grade, autonomous Retrieval-Augmented Generation (RAG) platform featuring **Agentic Chunking**, **Maximal Marginal Relevance (MMR)** semantic search, and **Groq LLaMA 3.3 70B** intelligence.

Refactored from a monolithic Streamlit app into a decoupled, scalable **React (Vite) Frontend** and **FastAPI Backend** designed for seamless cloud and container deployment.

---

## 🌟 Key Features

- ⚛️ **Modern React 18 Frontend:** Sleek dark-mode aesthetic, glassmorphism, responsive split-pane layout, real-time Server-Sent Events (SSE) streaming answers, and source attribution badges.
- ⚡ **High-Speed FastAPI Backend:** Fully async REST endpoints, automatic interactive Swagger UI documentation at `/docs`.
- 🧩 **Agentic Document Chunking:** LLM-driven intelligent boundary detection that parses documents into self-contained semantic topics, with robust heuristic fallback.
- 🎯 **Maximal Marginal Relevance (MMR) Retrieval:** Mathematical diversity reranking that eliminates redundant search results:
  $$\text{Score} = \lambda \cdot \text{Sim}(q, d) - (1 - \lambda) \cdot \max_{s \in S} \text{Sim}(d, s)$$
- 💾 **ChromaDB Persistent Vector Store:** Dense embeddings generated via Hugging Face `all-MiniLM-L6-v2` with on-disk persistence.
- 📁 **Multi-Format Ingestion:** Drag-and-drop support for **PDF**, **TXT**, **MD**, and **DOCX**, plus quick-paste text notes.
- 🐳 **Production Ready:** Complete Dockerfiles, Nginx configurations, `docker-compose.yml`, Vercel config, and deployment guides for Render / Railway.

---

## 🏛️ Project Structure

```
AgenticRAG-ChatBot/
├── backend/                       # FastAPI Backend
│   ├── app/
│   │   ├── api/                   # API Routes (chat, documents, config, health)
│   │   ├── core/                  # Settings and configuration
│   │   ├── models/                # Pydantic schemas
│   │   ├── services/              # RAG Engine & Document parser
│   │   └── main.py                # FastAPI entry point
│   ├── requirements.txt           # Python dependencies
│   ├── Dockerfile                 # Backend Dockerfile
│   └── .env.example
├── frontend/                      # React 18 + Vite Frontend
│   ├── src/
│   │   ├── components/            # Header, ChatWindow, DocumentManager, Modals
│   │   ├── services/              # API client (REST & SSE streaming)
│   │   ├── App.jsx                # Main React App component
│   │   └── index.css              # Glassmorphic cyber design system
│   ├── nginx.conf                 # Production Nginx SPA configuration
│   ├── Dockerfile                 # Multi-stage frontend Dockerfile
│   ├── vercel.json                # Vercel SPA deployment config
│   └── package.json
├── docker-compose.yml             # Single-command fullstack launcher
├── DEPLOYMENT.md                  # Comprehensive deployment guide
├── app.py                         # Legacy Streamlit app (preserved)
└── README.md
```

---

## 🚀 Quick Start

### 1. Run with Docker Compose (Recommended)

```bash
# 1. Clone repository
git clone https://github.com/vidhulkumaar/AgenticRAG-ChatBot.git
cd AgenticRAG-ChatBot

# 2. Configure Groq API Key
cp .env.example .env
# Open .env and set your GROQ_API_KEY=gsk_...

# 3. Launch full stack
docker compose up --build
```
- Open **Frontend:** `http://localhost:3000`
- Open **Backend Docs:** `http://localhost:8000/docs`

---

### 2. Run Locally for Development

#### Backend:
```bash
cd backend
python -m venv venv
venv\Scripts\activate       # On Linux/Mac: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # Set your GROQ_API_KEY
uvicorn app.main:app --reload --port 8000
```

#### Frontend:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 📖 Deployment Guides

Detailed deployment instructions for **Vercel**, **Render**, **Railway**, and **Docker** can be found in [DEPLOYMENT.md](file:///d:/rag_app/AgenticRAG-ChatBot/DEPLOYMENT.md).

---

## 🔑 Environment Variables

| Variable | Description | Default |
|---|---|---|
| `GROQ_API_KEY` | Your Groq Cloud API Key | *(Required)* |
| `LLM_MODEL` | Groq LLM model name | `qwen/qwen3.8-27b` |
| `EMBED_MODEL` | Hugging Face embedding model | `all-MiniLM-L6-v2` |
| `CHROMA_PERSIST_DIR` | Directory for vector database | `./chroma_db` |
