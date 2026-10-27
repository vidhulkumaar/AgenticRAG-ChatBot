import React from 'react';
import { Brain, Cpu, Settings, Layers, Key, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function Header({ 
  systemConfig, 
  onOpenArchitecture, 
  onOpenSettings,
  totalDocs,
  totalChunks
}) {
  const isGroqReady = systemConfig?.groq_api_key_configured;

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 28px',
      borderBottom: '1px solid var(--border-color)',
      background: 'rgba(10, 12, 20, 0.85)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
    }}>
      {/* Brand Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          background: 'var(--accent-gradient)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--accent-glow)',
        }}>
          <Brain size={24} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '19px',
              fontWeight: 700,
              letterSpacing: '-0.5px',
              background: 'linear-gradient(to right, #ffffff, #cbd5e1)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              AgenticRAG<span style={{ color: 'var(--accent-primary)' }}>-</span>chatBot
            </span>
            <span className="badge badge-accent">v1.0 REACT</span>
          </div>
          <div style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '2px',
          }}>
            <span>FastAPI + ChromaDB</span>
            <span>•</span>
            <span style={{ color: 'var(--cyan-primary)' }}>MMR Retrieval</span>
            <span>•</span>
            <span>Groq LLaMA 3.3</span>
          </div>
        </div>
      </div>

      {/* Right Action Tools */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Knowledge Base Status Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--bg-surface)',
          padding: '6px 14px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          fontSize: '12px',
        }} className="mono">
          <span style={{ color: 'var(--text-muted)' }}>KB:</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{totalDocs} docs</span>
          <span style={{ color: 'var(--border-color)' }}>|</span>
          <span style={{ color: 'var(--teal-primary)', fontWeight: 600 }}>{totalChunks} chunks</span>
        </div>

        {/* Groq Key Status */}
        <div 
          onClick={onOpenSettings}
          title={isGroqReady ? "Groq API connected" : "Groq API Key missing - click to configure"}
          style={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: 'var(--radius-md)',
            border: isGroqReady ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.4)',
            background: isGroqReady ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
            color: isGroqReady ? 'var(--success)' : 'var(--warning)',
            fontSize: '12px',
            fontWeight: 500,
          }}
        >
          {isGroqReady ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          <span>{isGroqReady ? 'Groq Active' : 'Set Groq Key'}</span>
        </div>

        {/* Architecture Visualizer Button */}
        <button
          id="btn-open-arch"
          onClick={onOpenArchitecture}
          className="btn btn-secondary"
          style={{ padding: '7px 14px', fontSize: '13px' }}
        >
          <Layers size={16} color="var(--cyan-primary)" />
          <span>Architecture</span>
        </button>

        {/* Settings Button */}
        <button
          id="btn-open-settings"
          onClick={onOpenSettings}
          className="btn btn-secondary"
          style={{ padding: '7px 12px' }}
          title="Engine Settings & Model Parameters"
        >
          <Settings size={17} color="var(--text-secondary)" />
        </button>
      </div>
    </header>
  );
}
