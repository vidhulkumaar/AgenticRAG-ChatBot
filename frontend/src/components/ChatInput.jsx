import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, RefreshCw, Trash2 } from 'lucide-react';

export default function ChatInput({ 
  onSendMessage, 
  isLoading, 
  currentModel,
  hasMessages,
  onClearChat,
  disabled
}) {
  const [input, setInput] = useState('');
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [input]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!input.trim() || isLoading || disabled) return;
    onSendMessage(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div style={{
      padding: '16px 24px',
      borderTop: '1px solid var(--border-color)',
      background: 'rgba(10, 12, 20, 0.85)',
      backdropFilter: 'blur(12px)',
    }}>
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '8px 12px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
          transition: 'border-color 0.2s ease',
        }}
        onFocus={() => {
          if (textareaRef.current) textareaRef.current.parentElement.style.borderColor = 'var(--accent-primary)';
        }}
        onBlur={() => {
          if (textareaRef.current) textareaRef.current.parentElement.style.borderColor = 'var(--border-color)';
        }}
      >
        {/* Textarea */}
        <textarea
          id="chat-input-textarea"
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Please index documents or configure your Groq key to start chatting..." : "Ask anything about your documents... (Enter to send, Shift+Enter for new line)"}
          rows={1}
          disabled={disabled}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            fontSize: '14.5px',
            fontFamily: 'var(--font-sans)',
            resize: 'none',
            outline: 'none',
            padding: '6px 4px',
            lineHeight: '1.5',
            maxHeight: '140px',
          }}
        />

        {/* Input Bar Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '6px',
          paddingTop: '6px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        }}>
          {/* Left Metadata info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-accent" style={{ fontSize: '10px' }}>
              <Sparkles size={11} />
              <span>{currentModel || 'LLaMA 3.3'}</span>
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              MMR Semantic Search
            </span>
          </div>

          {/* Right Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {hasMessages && (
              <button
                type="button"
                id="btn-clear-chat"
                onClick={onClearChat}
                className="btn-danger-ghost"
                style={{ padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="Clear chat history"
              >
                <Trash2 size={13} />
                <span>Clear</span>
              </button>
            )}

            <button
              type="submit"
              id="btn-send-message"
              className="btn btn-primary"
              disabled={!input.trim() || isLoading || disabled}
              style={{
                padding: '7px 16px',
                fontSize: '13px',
                borderRadius: 'var(--radius-md)',
              }}
            >
              {isLoading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <span>Send</span>
                  <Send size={13} />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
