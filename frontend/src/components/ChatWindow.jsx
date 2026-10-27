import React, { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Bot, 
  User, 
  Copy, 
  Check, 
  Sparkles, 
  BookOpen, 
  Clock, 
  Layers,
  ChevronRight,
  RefreshCw
} from 'lucide-react';

export default function ChatWindow({ 
  messages, 
  isStreaming, 
  streamingText, 
  streamingMetadata, 
  onPromptClick,
  onViewChunks,
  onClearChat
}) {
  const scrollRef = useRef(null);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Auto scroll to bottom when new messages arrive or when streaming
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingText]);

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const starterPrompts = [
    "Summarize the key points of the uploaded documents.",
    "What are the main methodologies or findings discussed?",
    "Extract any important dates, statistics, or metrics.",
    "Compare the perspectives presented in the knowledge base."
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      position: 'relative',
    }}>
      {/* Messages Scroll Area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {messages.length === 0 && !isStreaming ? (
          /* Empty State */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--text-muted)',
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'rgba(99, 102, 241, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              boxShadow: 'var(--accent-glow)',
            }}>
              <Sparkles size={32} color="var(--accent-primary)" />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Autonomous RAG Chat Assistant
            </h3>
            <p style={{ fontSize: '13.5px', maxWidth: '440px', lineHeight: '1.6', marginBottom: '24px' }}>
              Index documents in the left panel, then ask any question. Answers are synthesized using
              Maximal Marginal Relevance (MMR) retrieval & Groq LLaMA 3.3.
            </p>

            {/* Quick Starter Suggestions */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '10px',
              width: '100%',
              maxWidth: '540px',
            }}>
              {starterPrompts.map((prompt, pIdx) => (
                <button
                  key={pIdx}
                  onClick={() => onPromptClick(prompt)}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    textAlign: 'left',
                    color: 'var(--text-secondary)',
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-hover)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <span>{prompt}</span>
                  <ChevronRight size={14} style={{ opacity: 0.6, flexShrink: 0 }} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Chat History */
          <>
            {messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
                className="animate-fade-in"
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  maxWidth: '82%',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                }}>
                  {/* Avatar Icon */}
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    background: msg.role === 'user' ? 'var(--accent-gradient)' : 'var(--bg-surface-elevated)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: msg.role === 'user' ? 'var(--accent-glow)' : 'none',
                    border: msg.role === 'assistant' ? '1px solid var(--border-color)' : 'none',
                  }}>
                    {msg.role === 'user' ? (
                      <User size={18} color="#ffffff" />
                    ) : (
                      <Bot size={18} color="var(--accent-primary)" />
                    )}
                  </div>

                  {/* Bubble Container */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{
                      padding: '14px 18px',
                      borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      background: msg.role === 'user' ? 'var(--accent-primary)' : 'var(--bg-surface)',
                      color: msg.role === 'user' ? '#ffffff' : 'var(--text-primary)',
                      border: msg.role === 'user' ? 'none' : '1px solid var(--border-color)',
                      boxShadow: msg.role === 'user' ? '0 4px 15px rgba(99, 102, 241, 0.25)' : '0 4px 12px rgba(0,0,0,0.2)',
                    }}>
                      {msg.role === 'user' ? (
                        <div style={{ fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                          {msg.content}
                        </div>
                      ) : (
                        <div className="markdown-prose">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      )}
                    </div>

                    {/* Metadata Footer for Assistant Message */}
                    {msg.role === 'assistant' && (
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: '8px',
                        paddingLeft: '4px',
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                      }}>
                        {/* Source Tags */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center' }}>
                            <span style={{ fontSize: '10px' }}>Sources:</span>
                            {msg.sources.map((src, sIdx) => (
                              <span
                                key={sIdx}
                                onClick={() => onViewChunks(msg.retrieved_chunks || [], src)}
                                style={{
                                  background: 'var(--bg-surface-elevated)',
                                  border: '1px solid var(--border-color)',
                                  color: 'var(--teal-primary)',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '10.5px',
                                }}
                                className="mono"
                                title="Click to view retrieved context chunks"
                              >
                                <BookOpen size={11} />
                                <span>{src}</span>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Latency / Model Pill */}
                        {msg.latency_ms && (
                          <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Clock size={11} />
                            <span>{msg.latency_ms}ms</span>
                          </span>
                        )}

                        {/* Copy Button */}
                        <button
                          onClick={() => handleCopy(msg.content, index)}
                          className="btn-danger-ghost"
                          style={{
                            padding: '3px 6px',
                            color: copiedIndex === index ? 'var(--success)' : 'var(--text-muted)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                          }}
                        >
                          {copiedIndex === index ? <Check size={12} /> : <Copy size={12} />}
                          <span>{copiedIndex === index ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Real-time Streaming Response Bubble */}
            {isStreaming && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  maxWidth: '82%',
                }}
                className="animate-fade-in"
              >
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: 'var(--bg-surface-elevated)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: '1px solid var(--border-color)',
                }}>
                  <Bot size={18} color="var(--accent-primary)" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{
                    padding: '14px 18px',
                    borderRadius: '18px 18px 18px 4px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-hover)',
                    color: 'var(--text-primary)',
                    boxShadow: 'var(--accent-glow)',
                  }}>
                    {streamingText ? (
                      <div className="markdown-prose">
                        <ReactMarkdown>{streamingText}</ReactMarkdown>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                        <RefreshCw size={14} className="animate-spin" />
                        <span style={{ fontSize: '13px' }}>MMR Retrieval & Groq Synthesis...</span>
                      </div>
                    )}
                  </div>

                  {streamingMetadata?.sources && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11px',
                      color: 'var(--teal-primary)',
                      paddingLeft: '4px',
                    }}>
                      <span>Retrieving from:</span>
                      {streamingMetadata.sources.map((s, idx) => (
                        <span key={idx} className="mono" style={{ background: 'var(--bg-surface)', padding: '2px 6px', borderRadius: '4px' }}>
                          📄 {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
