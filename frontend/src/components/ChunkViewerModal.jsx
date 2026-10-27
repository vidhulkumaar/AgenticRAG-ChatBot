import React from 'react';
import { X, BookOpen, Layers, CheckCircle } from 'lucide-react';

export default function ChunkViewerModal({ isOpen, onClose, chunks, sourceFilter }) {
  if (!isOpen) return null;

  const displayChunks = sourceFilter 
    ? chunks.filter((c) => c.source === sourceFilter)
    : chunks;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(5, 7, 12, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 110,
      padding: '20px',
    }} onClick={onClose}>
      <div
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: '85vh',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-hover)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), var(--accent-glow)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
        className="animate-fade-in"
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-color)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(6, 182, 212, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <BookOpen size={18} color="var(--cyan-primary)" />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 600 }}>Retrieved Context Chunks</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {sourceFilter ? `Filtered by source: ${sourceFilter}` : 'All MMR retrieved passages'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-danger-ghost" style={{ borderRadius: '50%', padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Chunks List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}>
          {displayChunks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
              No chunk text available for this selection.
            </div>
          ) : (
            displayChunks.map((chunk, idx) => (
              <div
                key={chunk.id || idx}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  paddingBottom: '6px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge badge-accent" style={{ fontSize: '10px' }}>
                      Chunk #{idx + 1}
                    </span>
                    <span className="mono" style={{ fontSize: '12px', color: 'var(--cyan-primary)' }}>
                      📄 {chunk.source}
                    </span>
                  </div>

                  {chunk.score !== undefined && (
                    <span className="mono" style={{ fontSize: '11px', color: 'var(--success)' }}>
                      Relevance: {(chunk.score * 100).toFixed(1)}%
                    </span>
                  )}
                </div>

                <div style={{
                  fontSize: '13px',
                  lineHeight: '1.65',
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-wrap',
                }}>
                  {chunk.text}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
