import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  FileCode, 
  Trash2, 
  Plus, 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle,
  File, 
  Layers, 
  Sparkles,
  RefreshCw
} from 'lucide-react';

export default function DocumentManager({ 
  documents, 
  onUploadFiles, 
  onAddText, 
  onDeleteDocument, 
  onClearAll,
  isProcessing 
}) {
  const [activeTab, setActiveTab] = useState('files'); // 'files' | 'text'
  const [dragOver, setDragOver] = useState(false);
  const [rawText, setRawText] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB limit for free tier host

  const handleFiles = async (filesList) => {
    setErrorMsg('');
    setSuccessMsg('');

    // Pre-flight check: validate 10 MB limit for free tier host
    const oversized = filesList.find(f => f.size > MAX_FILE_SIZE);
    if (oversized) {
      setErrorMsg(`"${oversized.name}" exceeds the 10 MB limit. Only files up to 10 MB (Text, PDF, or Word) are allowed due to free tier host limits.`);
      return;
    }

    try {
      const res = await onUploadFiles(filesList);
      if (res?.success) {
        setSuccessMsg(res.message);
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to upload files.');
    }
  };

  const handleAddTextSubmit = async (e) => {
    e.preventDefault();
    if (!rawText.trim()) {
      setErrorMsg('Please enter some text first.');
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await onAddText(rawText, textTitle);
      setRawText('');
      setTextTitle('');
      if (res?.success) {
        setSuccessMsg(res.message);
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to index text.');
    }
  };

  const getFileIcon = (name) => {
    const ext = name.split('.').pop().toLowerCase();
    if (ext === 'pdf') return <FileText size={18} color="#ef4444" />;
    if (['txt', 'md'].includes(ext)) return <FileCode size={18} color="#38bdf8" />;
    if (['doc', 'docx'].includes(ext)) return <FileText size={18} color="#3b82f6" />;
    return <File size={18} color="#a855f7" />;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      gap: '16px',
    }}>
      {/* Free Tier Host Notice Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        background: 'rgba(245, 158, 11, 0.08)',
        border: '1px solid rgba(245, 158, 11, 0.25)',
        padding: '10px 12px',
        borderRadius: 'var(--radius-md)',
        fontSize: '12px',
        lineHeight: '1.5',
      }}>
        <AlertTriangle size={18} color="var(--warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <span style={{ color: 'var(--warning)', fontWeight: 600 }}>Free Tier Host Notice: </span>
          <span style={{ color: 'var(--text-secondary)' }}>
            Only files <strong style={{ color: 'var(--text-primary)' }}>up to 10 MB</strong> (<strong style={{ color: 'var(--text-primary)' }}>Text, PDF, or Word</strong>) are allowed because the backend runs on a free tier host.
          </span>
        </div>
      </div>

      {/* Tab Switcher: Files vs Raw Text */}
      <div style={{
        display: 'flex',
        background: 'var(--bg-surface)',
        padding: '4px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
      }}>
        <button
          onClick={() => setActiveTab('files')}
          style={{
            flex: 1,
            padding: '8px',
            fontSize: '13px',
            fontWeight: 500,
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            background: activeTab === 'files' ? 'var(--bg-surface-hover)' : 'transparent',
            color: activeTab === 'files' ? 'var(--text-primary)' : 'var(--text-muted)',
            boxShadow: activeTab === 'files' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
          }}
        >
          <UploadCloud size={15} />
          <span>Upload Files</span>
        </button>

        <button
          onClick={() => setActiveTab('text')}
          style={{
            flex: 1,
            padding: '8px',
            fontSize: '13px',
            fontWeight: 500,
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            background: activeTab === 'text' ? 'var(--bg-surface-hover)' : 'transparent',
            color: activeTab === 'text' ? 'var(--text-primary)' : 'var(--text-muted)',
            boxShadow: activeTab === 'text' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
          }}
        >
          <Sparkles size={15} />
          <span>Paste Text</span>
        </button>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--danger-bg)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: 'var(--danger)',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }} className="animate-fade-in">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--success-bg)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: 'var(--success)',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }} className="animate-fade-in">
          <CheckCircle size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Active Tab Area */}
      {activeTab === 'files' ? (
        /* Drag & Drop File Zone */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? 'var(--accent-primary)' : 'var(--border-color)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: '24px 16px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragOver ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-surface)',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            accept=".pdf,.txt,.md,.docx"
            style={{ display: 'none' }}
          />

          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            background: 'rgba(99, 102, 241, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-primary)',
          }}>
            {isProcessing ? (
              <RefreshCw size={22} className="animate-spin" />
            ) : (
              <UploadCloud size={22} />
            )}
          </div>

          <div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>
              {isProcessing ? 'Processing & Vectorizing...' : 'Drop Text, PDF, or Word files here'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
              Supports PDF (.pdf), Word (.docx), or Text (.txt, .md)
            </div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              color: 'var(--warning)',
              marginTop: '8px',
              background: 'var(--warning-bg)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600
            }}>
              <AlertTriangle size={13} color="var(--warning)" />
              <span>Only files up to 10 MB (Text, PDF, or Word) are allowed — Free Tier Host</span>
            </div>
          </div>

          <div className="badge badge-accent" style={{ fontSize: '10px' }}>
            Agentic Chunking + ChromaDB
          </div>
        </div>
      ) : (
        /* Paste Raw Text Form */
        <form onSubmit={handleAddTextSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Snippet title (optional, e.g. meeting_notes)"
            value={textTitle}
            onChange={(e) => setTextTitle(e.target.value)}
          />
          <textarea
            className="textarea-field"
            rows={4}
            placeholder="Paste raw text, articles, or documentation here..."
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isProcessing || !rawText.trim()}
            style={{ width: '100%' }}
          >
            {isProcessing ? (
              <>
                <RefreshCw size={15} className="animate-spin" />
                <span>Chunking & Indexing...</span>
              </>
            ) : (
              <>
                <Plus size={15} />
                <span>Index into Knowledge Base</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* Document Inventory List Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '6px',
        paddingBottom: '8px',
        borderBottom: '1px solid var(--border-color)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={16} color="var(--cyan-primary)" />
          <span style={{ fontSize: '14px', fontWeight: 600 }}>Indexed Documents</span>
          <span className="badge badge-cyan" style={{ fontSize: '10px' }}>
            {documents.length}
          </span>
        </div>

        {documents.length > 0 && (
          <button
            onClick={onClearAll}
            className="btn-danger-ghost"
            style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
            title="Clear entire knowledge base"
          >
            <Trash2 size={13} />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {/* Document List Scroll Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        paddingRight: '4px',
        minHeight: '220px',
      }}>
        {documents.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-muted)',
            textAlign: 'center',
            padding: '30px 10px',
            border: '1px dashed var(--border-color)',
            borderRadius: 'var(--radius-md)',
          }}>
            <FileText size={32} style={{ marginBottom: '8px', opacity: 0.4 }} />
            <div style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--text-secondary)' }}>
              No documents yet
            </div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              Upload files or paste text above to build your vector knowledge base.
            </div>
          </div>
        ) : (
          documents.map((doc, idx) => (
            <div
              key={doc.id || idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                transition: 'all 0.2s ease',
              }}
              className="animate-fade-in"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                <div style={{
                  minWidth: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  background: 'var(--bg-surface-hover)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {getFileIcon(doc.name)}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '180px',
                  }} title={doc.name}>
                    {doc.name}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '2px',
                  }}>
                    <span>{doc.size}</span>
                    <span>•</span>
                    <span style={{ color: 'var(--teal-primary)' }}>{doc.chunks} chunks</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-ready" style={{ fontSize: '9px', padding: '2px 6px' }}>
                  READY
                </span>
                <button
                  onClick={() => onDeleteDocument(doc.name)}
                  className="btn-danger-ghost"
                  title={`Delete ${doc.name}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
