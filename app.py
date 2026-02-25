import streamlit as st
import time
import os
import json
import numpy as np
from PyPDF2 import PdfReader
from sentence_transformers import SentenceTransformer
import chromadb
from groq import Groq
# The 'google.colab' module is not available in the Streamlit app's environment.
# The GROQ_API_KEY will be passed via environment variable from the Colab notebook.

# ── Config ────────────────────────────────────────────
GROQ_API_KEY   = os.getenv('GROQ_API_KEY') # 🔑 Get from environment variable
EMBED_MODEL    = "all-MiniLM-L6-v2"
LLM_MODEL = "llama-3.3-70b-versatile"
TOP_K          = 3
FETCH_K        = 20
LAMBDA_MMR     = 0.5

# ── Init Models (cached) ──────────────────────────────
@st.cache_resource
def load_models():
    # Ensure GROQ_API_KEY is available
    if not GROQ_API_KEY:
        st.error("GROQ_API_KEY not found. Please set it in Colab secrets and rerun the cells.")
        st.stop()
    embed = SentenceTransformer(EMBED_MODEL)
    chroma = chromadb.Client()
    collection = chroma.get_or_create_collection("rag_kb")
    groq_client = Groq(api_key=GROQ_API_KEY)
    return embed, collection, groq_client

embed_model, collection, groq_client = load_models()


def load_document(uploaded_file):
    ext = os.path.splitext(uploaded_file.name)[-1].lower()
    if ext == ".pdf":
        reader = PdfReader(uploaded_file)
        text = "\n".join([p.extract_text() for p in reader.pages if p.extract_text()])
    elif ext in [".txt", ".md"]:
        text = uploaded_file.read().decode("utf-8")
    else:
        return None
    return {"filename": uploaded_file.name, "text": text}

def agentic_chunk(doc):
    text = doc["text"]
    rough_blocks = [p.strip() for p in text.split("\n\n") if p.strip()]

    prompt = f"""You are a document chunking expert.
Split the following text into meaningful, self-contained chunks.
Each chunk should:
- Cover ONE complete idea or topic
- Be readable and meaningful on its own
- Not be too short (min 2-3 sentences) or too long (max ~200 words)

Return ONLY a JSON array of strings. No explanation, no markdown.

Text:
{text[:6000]}
"""
    response = groq_client.chat.completions.create(
        model=LLM_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.0,
        max_tokens=4096
    )
    raw = response.choices[0].message.content.strip()
    try:
        if "```" in raw:
            raw = raw.split("```")[-1].replace("json", "").strip()
        chunks = json.loads(raw)
    except json.JSONDecodeError:
        chunks = rough_blocks

    result = []
    for i, chunk in enumerate(chunks):
        if chunk.strip():
            result.append({
                "id": f"{doc['filename']}_chunk_{i}",
                "text": chunk.strip(),
                "source": doc["filename"]
            })
    return result

def embed_and_store(chunks):
    existing_ids = set(collection.get()["ids"])
    new_chunks = [c for c in chunks if c["id"] not in existing_ids]
    if not new_chunks:
        return 0
    texts      = [c["text"]   for c in new_chunks]
    ids        = [c["id"]     for c in new_chunks]
    metadatas  = [{"source": c["source"]} for c in new_chunks]
    embeddings = embed_model.encode(texts).tolist()
    collection.add(ids=ids, documents=texts, embeddings=embeddings, metadatas=metadatas)
    return len(new_chunks)

def mmr_retrieve(query):
    if collection.count() == 0:
        return []
    query_vec = embed_model.encode([query])[0]
    results = collection.query(
        query_embeddings=[query_vec.tolist()],
        n_results=min(FETCH_K, collection.count()),
        include=["documents", "embeddings", "metadatas"]
    )
    docs_list = results["documents"][0]
    embeds    = np.array(results["embeddings"][0])
    metas     = results["metadatas"][0]

    selected, remaining = [], list(range(len(docs_list)))
    for _ in range(min(TOP_K, len(docs_list))):
        if not remaining:
            break
        relevance = np.dot(embeds[remaining], query_vec)
        if selected:
            sim = np.max(np.dot(embeds[remaining], embeds[selected].T), axis=1)
        else:
            sim = np.zeros(len(remaining))
        scores = LAMBDA_MMR * relevance - (1 - LAMBDA_MMR) * sim
        best = remaining[np.argmax(scores)]
        selected.append(best)
        remaining.remove(best)

    return [{"text": docs_list[i], "source": metas[i]["source"]} for i in selected]

def generate_answer(query, retrieved):
    if not retrieved:
        return "❌ No relevant chunks found. Please upload and index a document first."
    context = "\n\n".join([f"[Source: {c['source']}]\n{c['text']}" for c in retrieved])
    prompt = f"""You are a helpful assistant. Answer using ONLY the context below.
If the answer is not in the context, say "I don't have enough information."

Context:
{context}

Question: {query}

Answer:"""
    response = groq_client.chat.completions.create(
        model=LLM_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        max_tokens=1024
    )
    return response.choices[0].message.content.strip()


# ════════════════
# STREAMLIT UI
# ════════════════

st.set_page_config(page_title="AgenticRAG ChatBot", page_icon="🧠", layout="wide")

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;600&display=swap');
:root {
    --bg:#0f1117; --surface:#1a1d27; --surface2:#22263a;
    --border:#2e3347; --accent:#6c63ff; --accent-dim:rgba(108,99,255,0.15);
    --teal:#3ecfcf; --text:#e2e4f0; --muted:#5c6180; --success:#34d399;
}
* { font-family:'Inter',sans-serif; box-sizing:border-box; }
.stApp { background:var(--bg); color:var(--text); }
section[data-testid="stSidebar"] { display:none !important; }
[data-testid="collapsedControl"]  { display:none !important; }
#MainMenu,footer,header { visibility:hidden; }

.topbar { display:flex; align-items:center; justify-content:space-between;
    padding:16px 0 20px 0; border-bottom:1px solid var(--border); margin-bottom:20px; }
.brand { display:flex; align-items:center; gap:10px; }
.brand-name { font-family:'JetBrains Mono',monospace; font-size:20px; font-weight:600; color:var(--text); }
.brand-dot  { color:var(--accent); }
.pill { background:var(--accent-dim); color:var(--accent); font-size:10px;
    font-family:'JetBrains Mono',monospace; padding:4px 10px; border-radius:20px; letter-spacing:1px; }

.file-chip { display:flex; align-items:center; gap:10px; background:var(--surface2);
    border:1px solid var(--border); border-radius:10px; padding:10px 14px; margin-bottom:8px; }
.file-chip-name { font-size:13px; font-weight:500; }
.file-chip-meta { font-size:11px; color:var(--muted); margin-top:2px; }
.file-chip-badge { margin-left:auto; background:rgba(52,211,153,0.12); color:var(--success);
    font-size:10px; font-family:'JetBrains Mono',monospace; padding:3px 8px; border-radius:4px; }

.chat-window { background:var(--surface); border:1px solid var(--border); border-radius:14px;
    padding:20px; min-height:420px; max-height:420px; overflow-y:auto; margin-bottom:14px; }
.empty-state { display:flex; flex-direction:column; align-items:center;
    justify-content:center; height:360px; color:var(--muted); text-align:center; }
.empty-icon  { font-size:42px; margin-bottom:12px; }
.empty-title { font-size:15px; font-weight:500; color:var(--text); }
.empty-sub   { font-size:12px; margin-top:4px; }

.msg-row-user { display:flex; justify-content:flex-end; margin-bottom:14px; }
.msg-row-bot  { display:flex; justify-content:flex-start; margin-bottom:14px; }
.bubble-user { background:var(--accent); color:white; padding:11px 16px;
    border-radius:18px 18px 4px 18px; max-width:70%; font-size:14px; line-height:1.55; }
.bubble-bot  { background:var(--surface2); border:1px solid var(--border); color:var(--text);
    padding:11px 16px; border-radius:18px 18px 18px 4px; max-width:70%; font-size:14px; line-height:1.55; }
.msg-time { font-size:10px; color:var(--muted); font-family:'JetBrains Mono',monospace;
    margin-top:4px; text-align:right; }
.src-tag { display:inline-block; background:var(--surface); border:1px solid var(--border);
    color:var(--teal); font-size:10px; font-family:'JetBrains Mono',monospace;
    padding:2px 7px; border-radius:4px; margin:5px 3px 0 0; }

.stButton > button { background:var(--accent) !important; color:white !important;
    border:none !important; border-radius:9px !important; font-weight:500 !important;
    font-size:14px !important; padding:10px 20px !important; }
.stButton > button:hover { opacity:0.87 !important; }

.stTextInput > div > div > input,
.stTextArea  > div > div > textarea {
    background:var(--surface2) !important; border:1px solid var(--border) !important;
    color:var(--text) !important; border-radius:10px !important; font-size:14px !important; }
.stTextInput > div > div > input:focus,
.stTextArea  > div > div > textarea:focus {
    border-color:var(--accent) !important; box-shadow:0 0 0 3px var(--accent-dim) !important; }

div[data-testid="stFileUploader"] { background:var(--surface2);
    border:2px dashed var(--border); border-radius:12px; padding:6px; }

::-webkit-scrollbar { width:5px; }
::-webkit-scrollbar-track { background:transparent; }
::-webkit-scrollbar-thumb { background:var(--border); border-radius:4px; }
</style>
""", unsafe_allow_html=True)

# Session state
if "messages" not in st.session_state: st.session_state.messages = []
if "docs"     not in st.session_state: st.session_state.docs     = []

# ── Top Bar ───────────────────────────────────────────
st.markdown("""
<div class="topbar">
    <div class="brand">
        <span style="font-size:26px">🧠</span>
        <span class="brand-name">AgenticRAG<span class="brand-dot">-</span>chatBot</span>
    </div>
    <span class="pill">BETA</span>
</div>
""", unsafe_allow_html=True)

# ── Architecture Box ──────────────────────────────────
st.markdown("""
<div style="background:#1a1d27;border:1px solid #2e3347;border-left:4px solid #6c63ff;
    border-radius:10px;padding:16px 20px;margin:0 0 20px 0;font-size:13px;
    line-height:1.8;color:#e2e4f0;font-family:'JetBrains Mono',monospace;">
    <div style="font-weight:700;font-size:14px;color:#6c63ff;margin-bottom:10px;">RAG Application Architecture</div>
    <div style="color:#3ecfcf;font-weight:600;">Phase 1 – Data Ingestion</div>
    <div style="margin-left:16px;color:#b0b3c6;">• Agentic chunking</div>
    <div style="margin-left:16px;color:#b0b3c6;">• Embedding Model – HuggingFace (all-MiniLM-L6-v2)</div>
    <div style="margin-left:16px;color:#b0b3c6;">• Vector Database – ChromaDB</div><br>
    <div style="color:#3ecfcf;font-weight:600;">Phase 2 – Retrieval</div>
    <div style="margin-left:16px;color:#b0b3c6;">• Query Embedding – HuggingFace (all-MiniLM-L6-v2)</div>
    <div style="margin-left:16px;color:#b0b3c6;">• Semantic search using MMR (Max Marginal Relevance)</div><br>
    <div style="color:#3ecfcf;font-weight:600;">Phase 3 – Generation</div>
    <div style="margin-left:16px;color:#b0b3c6;">• LLM – LLaMA 3 (served via Groq API)</div>
    <div style="margin-left:16px;color:#b0b3c6;">• Context-aware response generation</div>
</div>
""", unsafe_allow_html=True)

# ── Text → Knowledge Base ─────────────────────────────
st.markdown("##### ✏️ Paste or type text to add to Knowledge Base")
txt_col1, txt_col2 = st.columns([5, 1])
with txt_col1:
    text_input_box = st.text_area("text_kb", height=100, label_visibility="collapsed",
        placeholder="Paste any text here — saved as .txt and added to Knowledge Base...",
        key="text_kb_input")
with txt_col2:
    st.markdown("<div style='height:36px'></div>", unsafe_allow_html=True)
    add_text = st.button("➕ Add Text", use_container_width=True)

if add_text:
    if text_input_box.strip():
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        filename  = f"text_input_{timestamp}.txt"
        size_kb   = round(len(text_input_box.encode("utf-8")) / 1024, 1) or 0.1
        with open(filename, "w") as f:
            f.write(text_input_box)

        with st.spinner("🔄 Agentic chunking + embedding..."):
            doc    = {"filename": filename, "text": text_input_box}
            chunks = agentic_chunk(doc)
            stored = embed_and_store(chunks)

        if filename not in [d["name"] for d in st.session_state.docs]:
            st.session_state.docs.append({
                "name": filename,
                "size": f"{size_kb} KB",
                "type": "text/plain",
                "chunks": stored
            })
        st.success(f"✅ {stored} chunks indexed from text input!")
        st.rerun()
    else:
        st.warning("Please enter some text first.")

st.divider()

# ── Main Layout ───────────────────────────────────────
left, right = st.columns([1, 2], gap="large")

# ════════════════
# LEFT — Documents
# ════════════════
with left:
    st.markdown("#### 📁 Documents")

    uploaded = st.file_uploader("upload", type=["pdf", "txt", "md"],
        accept_multiple_files=True, label_visibility="collapsed")

    if uploaded:
        if st.button("⚡ Index Documents", use_container_width=True):
            for f in uploaded:
                if f.name in [d["name"] for d in st.session_state.docs]:
                    continue
                with st.spinner(f"🔄 Processing {f.name}..."):
                    doc    = load_document(f)
                    if not doc:
                        st.warning(f"Unsupported: {f.name}")
                        continue
                    chunks = agentic_chunk(doc)
                    stored = embed_and_store(chunks)
                    st.session_state.docs.append({
                        "name": f.name,
                        "size": f"{round(f.size/1024,1)} KB",
                        "type": f.type or "unknown",
                        "chunks": stored
                    })
            st.success("✅ All documents indexed!")
            st.rerun()

    st.markdown("#### Knowledge Base")

    if not st.session_state.docs:
        st.markdown("""
        <div style="text-align:center;padding:30px 10px;color:#5c6180;
                    border:2px dashed #2e3347;border-radius:12px;font-size:13px;">
            📂 No documents yet
        </div>""", unsafe_allow_html=True)
    else:
        for i, doc in enumerate(st.session_state.docs):
            icon = "📄" if "pdf" in doc["type"] else "📝"
            col_a, col_b = st.columns([5, 1])
            with col_a:
                st.markdown(f"""
                <div class="file-chip">
                    <span style="font-size:20px">{icon}</span>
                    <div>
                        <div class="file-chip-name">{doc["name"]}</div>
                        <div class="file-chip-meta">{doc["size"]} · {doc.get("chunks",0)} chunks</div>
                    </div>
                    <div class="file-chip-badge">✓ READY</div>
                </div>""", unsafe_allow_html=True)
            with col_b:
                if st.button("✕", key=f"rm_{i}"):
                    st.session_state.docs.pop(i)
                    st.rerun()

# ════════════
# RIGHT — Chat
# ════════════
with right:
    st.markdown("#### 📗 Chat")

    if not st.session_state.messages:
        st.markdown("""
        <div class="chat-window">
            <div class="empty-state">
                <div class="empty-icon">📗</div>
                <div class="empty-title">No messages yet</div>
                <div class="empty-sub">Upload a document and start asking questions</div>
            </div>
        </div>""", unsafe_allow_html=True)
    else:
        msgs_html = '<div class="chat-window">'
        for msg in st.session_state.messages:
            if msg["role"] == "user":
                msgs_html += f"""
                <div class="msg-row-user"><div>
                    <div class="bubble-user">{msg["content"]}</div>
                    <div class="msg-time">{msg.get("time","")}</div>
                </div></div>"""
            else:
                srcs = "".join([f'<span class="src-tag">📄 {s}</span>' for s in msg.get("sources",[])])
                msgs_html += f"""
                <div class="msg-row-bot"><div>
                    <div class="bubble-bot">{msg["content"]}</div>
                    {srcs}
                    <div class="msg-time">{msg.get("time","")}</div>
                </div></div>"""
        msgs_html += "</div>"
        st.markdown(msgs_html, unsafe_allow_html=True)

    col1, col2 = st.columns([5, 1])
    with col1:
        user_input = st.text_input("msg", placeholder="Ask something about your documents...",
            label_visibility="collapsed", key="user_msg")
    with col2:
        send = st.button("Send", use_container_width=True)

    if send and user_input.strip():
        if not st.session_state.docs:
            st.warning("Upload and index a document first.")
        else:
            t = time.strftime("%H:%M")
            st.session_state.messages.append({"role": "user", "content": user_input, "time": t})

            with st.spinner("🔍 Retrieving + generating..."):
                retrieved = mmr_retrieve(user_input)
                answer    = generate_answer(user_input, retrieved)
                sources   = list(set([c["source"] for c in retrieved]))

            st.session_state.messages.append({
                "role": "assistant", "content": answer,
                "sources": sources, "time": t
            })
            st.rerun()