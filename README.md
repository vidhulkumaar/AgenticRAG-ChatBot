# 🧠 AgenticRAG ChatBot

A **Retrieval-Augmented Generation (RAG)** chatbot that lets you chat intelligently with your own documents — PDFs, text files, and more — powered by **Groq (LLaMA 3)**, **ChromaDB**, and **HuggingFace Embeddings**.

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)
![Streamlit](https://img.shields.io/badge/Streamlit-Frontend-FF4B4B?logo=streamlit&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-LLaMA%203-orange)
![ChromaDB](https://img.shields.io/badge/ChromaDB-VectorStore-blueviolet)
![HuggingFace](https://img.shields.io/badge/HuggingFace-Embeddings-yellow?logo=huggingface)

---

## ✨ Features

| Feature | Detail |
|---|---|
| 🤖 **LLM** | LLaMA 3.3 70B via Groq API (ultra-fast inference) |
| 🔍 **Embeddings** | HuggingFace `all-MiniLM-L6-v2` (local, free) |
| 🗃️ **Vector Store** | ChromaDB (in-memory, no setup needed) |
| ✂️ **Chunking** | Agentic chunking via LLM (smarter than fixed-size) |
| � **Retrieval** | MMR (Max Marginal Relevance) for diverse results |
| 📄 **Doc Types** | PDF, TXT, Markdown |
| ✏️ **Text Input** | Paste raw text directly into the knowledge base |
| 🌐 **Colab Deploy** | Run anywhere via ngrok tunnel |

---

## 🗂️ Project Structure

```
RAG APP/
├── app.py              # Streamlit UI (main application)
├── main.py             # Google Colab launcher (ngrok tunnel)
├── requirements.txt    # Python dependencies
├── .env.example        # Environment variable template
├── .gitignore
└── README.md
```

---

## 🏗️ Architecture

```
Phase 1 — Ingestion
  PDF / TXT / MD  →  Agentic Chunking (LLaMA 3)  →  HuggingFace Embed  →  ChromaDB

Phase 2 — Retrieval
  User Query  →  HuggingFace Embed  →  MMR Search  →  Top-K Chunks

Phase 3 — Generation
  Context + Query  →  LLaMA 3.3 70B (Groq)  →  Answer + Source Tags
```

---

## 🚀 Getting Started

### Option A — Run Locally

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/rag-app.git
cd rag-app

# 2. Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set up environment
copy .env.example .env       # Windows
# cp .env.example .env       # macOS/Linux
# Fill in GROQ_API_KEY in .env

# 5. Run
streamlit run app.py
```

App opens at **http://localhost:8501**

---

### Option B — Run on Google Colab

1. Upload `app.py` and `main.py` to your Colab session
2. Add secrets in Colab:
   - `GROQ` → your Groq API key
   - `NGROK2` → your ngrok auth token
3. Run all cells in `main.py`
4. Click the ngrok public URL printed in the output

---

## 🔑 Environment Variables

| Variable | Description | Where to get |
|---|---|---|
| `GROQ_API_KEY` | Groq LLM API key | [console.groq.com](https://console.groq.com/) |
| `NGROK` | ngrok auth token (Colab only) | [dashboard.ngrok.com](https://dashboard.ngrok.com/get-started/your-authtoken) |

---

## 💬 How to Use

1. **Upload** PDF, TXT, or MD files — or paste text directly
2. Click **⚡ Index Documents** to embed into ChromaDB
3. **Ask questions** in the chat — get answers with source citations

---

## 🛠️ Tech Stack

| Component | Technology |
|---|---|
| Frontend | Streamlit |
| LLM | Groq — LLaMA 3.3 70B Versatile |
| Embeddings | HuggingFace `all-MiniLM-L6-v2` |
| Vector DB | ChromaDB |
| Chunking | Agentic (LLM-based) |
| Retrieval | MMR (Max Marginal Relevance) |
| Colab Tunnel | pyngrok |

---

## 📝 License

MIT License — free to use, modify, and distribute.
