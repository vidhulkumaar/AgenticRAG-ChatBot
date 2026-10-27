import React, { useState, useEffect } from 'react';
import { X, Key, Sliders, Cpu, Save, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export default function SettingsModal({ 
  isOpen, 
  onClose, 
  systemConfig, 
  retrievalSettings, 
  onSaveSettings 
}) {
  const [groqKey, setGroqKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState('qwen/qwen3.8-27b');
  const [topK, setTopK] = useState(3);
  const [fetchK, setFetchK] = useState(20);
  const [lambdaMmr, setLambdaMmr] = useState(0.5);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (systemConfig) {
      if (systemConfig.current_llm_model) setSelectedModel(systemConfig.current_llm_model);
    }
    if (retrievalSettings) {
      if (retrievalSettings.topK !== undefined) setTopK(retrievalSettings.topK);
      if (retrievalSettings.fetchK !== undefined) setFetchK(retrievalSettings.fetchK);
      if (retrievalSettings.lambdaMmr !== undefined) setLambdaMmr(retrievalSettings.lambdaMmr);
    }
  }, [systemConfig, retrievalSettings, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveSettings({
      groqApiKey: groqKey.trim() || undefined,
      llmModel: selectedModel,
      topK: Number(topK),
      fetchK: Number(fetchK),
      lambdaMmr: Number(lambdaMmr),
    });
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1200);
  };

  const availableModels = systemConfig?.available_models || [
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "allam-2-7b"
  ];

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
          maxWidth: '560px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-hover)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), var(--accent-glow)',
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
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Sliders size={18} color="var(--accent-primary)" />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 600 }}>Engine & Model Settings</h3>
          </div>
          <button onClick={onClose} className="btn-danger-ghost" style={{ borderRadius: '50%', padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Groq API Key */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
              Groq Cloud API Key
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                id="input-groq-key"
                type={showKey ? 'text' : 'password'}
                className="input-field"
                placeholder={systemConfig?.groq_api_key_configured ? "• • • • • • • • (Configured from Environment)" : "gsk_..."}
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="btn-danger-ghost"
                style={{ position: 'absolute', right: '8px', padding: '6px', color: 'var(--text-muted)' }}
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
              Get a free API key at <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" style={{ color: 'var(--cyan-primary)' }}>console.groq.com</a>.
            </span>
          </div>

          {/* Model Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
              LLM Model (Groq Inference)
            </label>
            <select
              id="select-llm-model"
              className="input-field"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{ cursor: 'pointer' }}
            >
              {availableModels.map((m) => (
                <option key={m} value={m} style={{ background: '#181c2b', color: '#f1f5f9' }}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* MMR Retrieval Parameters */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cyan-primary)' }}>
              Retrieval (MMR) Parameters
            </div>

            {/* Top-K */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Top-K Chunks to Return</span>
                <span className="mono" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{topK}</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
              />
            </div>

            {/* Fetch-K */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Fetch-K Candidate Pool</span>
                <span className="mono" style={{ color: 'var(--cyan-primary)', fontWeight: 600 }}>{fetchK}</span>
              </div>
              <input
                type="range"
                min={5}
                max={50}
                value={fetchK}
                onChange={(e) => setFetchK(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--cyan-primary)' }}
              />
            </div>

            {/* Lambda MMR */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>MMR Lambda (Relevance vs Diversity)</span>
                <span className="mono" style={{ color: 'var(--success)', fontWeight: 600 }}>{lambdaMmr}</span>
              </div>
              <input
                type="range"
                min={0.0}
                max={1.0}
                step={0.05}
                value={lambdaMmr}
                onChange={(e) => setLambdaMmr(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--success)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                <span>0.0 (Max Diversity)</span>
                <span>0.5 (Balanced)</span>
                <span>1.0 (Max Relevance)</span>
              </div>
            </div>
          </div>

          {/* Footer Submit */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              id="btn-save-settings"
              type="submit"
              className="btn btn-primary"
              style={{ minWidth: '120px' }}
            >
              {isSaved ? (
                <>
                  <CheckCircle2 size={16} />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Config</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
