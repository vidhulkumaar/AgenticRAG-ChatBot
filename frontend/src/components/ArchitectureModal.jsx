import React from 'react';
import { X, Database, Search, Sparkles, ArrowRight, ShieldCheck, Cpu } from 'lucide-react';

export default function ArchitectureModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(5, 7, 12, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '20px',
    }} onClick={onClose}>
      <div 
        style={{
          width: '100%',
          maxWidth: '860px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-hover)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), var(--accent-glow)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
        className="animate-fade-in"
      >
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-color)',
          background: 'rgba(255, 255, 255, 0.02)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Cpu size={18} color="var(--accent-primary)" />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 600 }}>RAG System Architecture & Pipeline</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Multi-phase autonomous knowledge processing with MMR retrieval & LLaMA 3.3
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-danger-ghost"
            style={{ borderRadius: '50%', padding: '6px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body: Pipeline Stages */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
          }}>
            {/* Phase 1: Ingestion */}
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '18px',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span className="badge badge-accent">PHASE 1</span>
                <Database size={18} color="var(--accent-primary)" />
              </div>
              <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--accent-primary)' }}>
                Data Ingestion
              </h4>
              <ul style={{
                listStyle: 'none',
                fontSize: '12.5px',
                color: 'var(--text-secondary)',
                lineHeight: '1.7',
                margin: 0,
                padding: 0,
              }}>
                <li>⚡ <strong>Agentic Chunking:</strong> LLM analyzes semantic boundaries to output clean JSON topic chunks.</li>
                <li>🧠 <strong>Embeddings:</strong> HuggingFace <code>all-MiniLM-L6-v2</code> 384-dimensional dense vectors.</li>
                <li>💾 <strong>Vector DB:</strong> ChromaDB with cosine distance metric and persistent storage.</li>
              </ul>
            </div>

            {/* Phase 2: Retrieval */}
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '18px',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span className="badge badge-cyan">PHASE 2</span>
                <Search size={18} color="var(--cyan-primary)" />
              </div>
              <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--cyan-primary)' }}>
                MMR Retrieval
              </h4>
              <ul style={{
                listStyle: 'none',
                fontSize: '12.5px',
                color: 'var(--text-secondary)',
                lineHeight: '1.7',
                margin: 0,
                padding: 0,
              }}>
                <li>🎯 <strong>Query Vectorization:</strong> User prompt encoded using MiniLM dense vector.</li>
                <li>⚖️ <strong>Max Marginal Relevance:</strong> Balances relevance vs diversity via λ (lambda) factor:</li>
                <code style={{ fontSize: '11px', display: 'block', background: 'rgba(0,0,0,0.3)', padding: '4px 6px', borderRadius: '4px', marginTop: '4px' }}>
                  Score = λ·Rel - (1-λ)·Sim
                </code>
                <li style={{ marginTop: '4px' }}>🛡️ Prevents redundant duplicate chunks from swamping the LLM context.</li>
              </ul>
            </div>

            {/* Phase 3: Generation */}
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '18px',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span className="badge badge-ready">PHASE 3</span>
                <Sparkles size={18} color="var(--success)" />
              </div>
              <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--success)' }}>
                LLM Generation
              </h4>
              <ul style={{
                listStyle: 'none',
                fontSize: '12.5px',
                color: 'var(--text-secondary)',
                lineHeight: '1.7',
                margin: 0,
                padding: 0,
              }}>
                <li>🚀 <strong>Groq LPU Engine:</strong> Extreme inference speed (&gt;300 tokens/sec).</li>
                <li>🦙 <strong>LLaMA 3.3 70B:</strong> High-precision context understanding and citation attribution.</li>
                <li>📡 <strong>SSE Real-Time Stream:</strong> Token-by-token response streaming directly to React.</li>
              </ul>
            </div>
          </div>

          {/* Architecture Tech Stack Pill Bar */}
          <div style={{
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 18px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            fontSize: '12px',
          }} className="mono">
            <span style={{ color: 'var(--text-muted)' }}>Frontend: <strong>React 18 + Vite SPA</strong></span>
            <span style={{ color: 'var(--border-color)' }}>•</span>
            <span style={{ color: 'var(--text-muted)' }}>Backend: <strong>FastAPI Async Python</strong></span>
            <span style={{ color: 'var(--border-color)' }}>•</span>
            <span style={{ color: 'var(--text-muted)' }}>Vectors: <strong>ChromaDB Persistent</strong></span>
            <span style={{ color: 'var(--border-color)' }}>•</span>
            <span style={{ color: 'var(--text-muted)' }}>Inference: <strong>Groq Cloud API</strong></span>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'flex-end',
          background: 'rgba(255, 255, 255, 0.01)',
        }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close Diagram
          </button>
        </div>
      </div>
    </div>
  );
}
