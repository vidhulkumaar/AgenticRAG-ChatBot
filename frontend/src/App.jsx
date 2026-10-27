import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import DocumentManager from './components/DocumentManager';
import ChatWindow from './components/ChatWindow';
import ChatInput from './components/ChatInput';
import ArchitectureModal from './components/ArchitectureModal';
import SettingsModal from './components/SettingsModal';
import ChunkViewerModal from './components/ChunkViewerModal';
import { api } from './services/api';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [systemConfig, setSystemConfig] = useState(null);
  const [retrievalSettings, setRetrievalSettings] = useState({
    topK: 3,
    fetchK: 20,
    lambdaMmr: 0.5,
  });

  // Processing & Loading States
  const [isProcessingDocs, setIsProcessingDocs] = useState(false);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [streamingMetadata, setStreamingMetadata] = useState(null);

  // Modals
  const [isArchOpen, setIsArchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [chunkModalData, setChunkModalData] = useState({
    isOpen: false,
    chunks: [],
    sourceFilter: '',
  });

  // Initial load
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [docsData, configData] = await Promise.allSettled([
        api.getDocuments(),
        api.getConfig(),
      ]);

      if (docsData.status === 'fulfilled') {
        setDocuments(docsData.value || []);
      }
      if (configData.status === 'fulfilled') {
        setSystemConfig(configData.value);
        if (configData.value) {
          setRetrievalSettings((prev) => ({
            ...prev,
            topK: configData.value.default_top_k ?? 3,
            lambdaMmr: configData.value.default_lambda_mmr ?? 0.5,
          }));
        }
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  // --- Document Actions ---
  const handleUploadFiles = async (files) => {
    setIsProcessingDocs(true);
    try {
      const res = await api.uploadDocuments(files);
      if (res?.indexed_documents) {
        setDocuments((prev) => {
          const names = new Set(res.indexed_documents.map((d) => d.name));
          const filtered = prev.filter((d) => !names.has(d.name));
          return [...filtered, ...res.indexed_documents];
        });
      }
      return res;
    } finally {
      setIsProcessingDocs(false);
    }
  };

  const handleAddText = async (text, title) => {
    setIsProcessingDocs(true);
    try {
      const res = await api.addTextSnippet(text, title);
      if (res?.indexed_documents) {
        setDocuments((prev) => [...prev, ...res.indexed_documents]);
      }
      return res;
    } finally {
      setIsProcessingDocs(false);
    }
  };

  const handleDeleteDocument = async (filename) => {
    try {
      await api.deleteDocument(filename);
      setDocuments((prev) => prev.filter((d) => d.name !== filename));
    } catch (err) {
      alert(`Could not delete document: ${err.message}`);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to delete all indexed documents? This cannot be undone.')) {
      return;
    }
    try {
      await api.clearAllDocuments();
      setDocuments([]);
    } catch (err) {
      alert(`Failed to clear knowledge base: ${err.message}`);
    }
  };

  // --- Chat Actions ---
  const handleSendMessage = async (userMessage) => {
    if (!userMessage.trim()) return;

    const userEntry = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userEntry]);
    setIsLoadingChat(true);
    setIsStreaming(true);
    setStreamingText('');
    setStreamingMetadata(null);

    let currentTokens = '';
    let metaHolder = null;

    try {
      await api.streamChatMessage({
        message: userMessage,
        topK: retrievalSettings.topK,
        fetchK: retrievalSettings.fetchK,
        lambdaMmr: retrievalSettings.lambdaMmr,
        model: systemConfig?.current_llm_model,
        onMetadata: (meta) => {
          metaHolder = meta;
          setStreamingMetadata(meta);
        },
        onToken: (token) => {
          currentTokens += token;
          setStreamingText(currentTokens);
        },
        onDone: () => {
          const botEntry = {
            role: 'assistant',
            content: currentTokens || 'No response generated.',
            sources: metaHolder?.sources || [],
            retrieved_chunks: metaHolder?.retrieved_chunks || [],
            model_used: metaHolder?.model_used || systemConfig?.current_llm_model || 'Groq',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages((prev) => [...prev, botEntry]);
          setIsStreaming(false);
          setStreamingText('');
          setStreamingMetadata(null);
          setIsLoadingChat(false);
        },
        onError: (err) => {
          console.error('Streaming error, falling back to standard POST:', err);
          fallbackStandardChat(userMessage);
        },
      });
    } catch (err) {
      fallbackStandardChat(userMessage);
    }
  };

  const fallbackStandardChat = async (userMessage) => {
    try {
      const res = await api.sendChatMessage({
        message: userMessage,
        topK: retrievalSettings.topK,
        fetchK: retrievalSettings.fetchK,
        lambdaMmr: retrievalSettings.lambdaMmr,
        model: systemConfig?.current_llm_model,
      });

      const botEntry = {
        role: 'assistant',
        content: res.answer,
        sources: res.sources,
        retrieved_chunks: res.retrieved_chunks,
        model_used: res.model_used,
        latency_ms: res.latency_ms,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botEntry]);
    } catch (err) {
      const errorEntry = {
        role: 'assistant',
        content: `⚠️ Error: ${err.message || 'Failed to generate response.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorEntry]);
    } finally {
      setIsStreaming(false);
      setStreamingText('');
      setStreamingMetadata(null);
      setIsLoadingChat(false);
    }
  };

  const handleSaveSettings = async ({ groqApiKey, llmModel, topK, fetchK, lambdaMmr }) => {
    try {
      const res = await api.updateConfig({
        groqApiKey,
        llmModel,
        topK,
        lambdaMmr,
      });
      setRetrievalSettings((prev) => ({
        ...prev,
        topK,
        fetchK,
        lambdaMmr,
      }));
      setSystemConfig((prev) => ({
        ...prev,
        groq_api_key_configured: res.groq_ready,
        current_llm_model: res.current_model || llmModel,
      }));
    } catch (err) {
      alert(`Failed to save settings: ${err.message}`);
    }
  };

  const handleViewChunks = (chunks, sourceFilter = '') => {
    setChunkModalData({
      isOpen: true,
      chunks,
      sourceFilter,
    });
  };

  const totalChunks = documents.reduce((acc, curr) => acc + (curr.chunks || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Top Navbar */}
      <Header
        systemConfig={systemConfig}
        onOpenArchitecture={() => setIsArchOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        totalDocs={documents.length}
        totalChunks={totalChunks}
      />

      {/* Main Content Workspace */}
      <main style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: 'minmax(320px, 380px) 1fr',
        gap: '20px',
        padding: '20px 28px',
        overflow: 'hidden',
      }}>
        {/* Left Column: Knowledge Base & Document Management */}
        <section className="glass-panel" style={{
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <DocumentManager
            documents={documents}
            onUploadFiles={handleUploadFiles}
            onAddText={handleAddText}
            onDeleteDocument={handleDeleteDocument}
            onClearAll={handleClearAll}
            isProcessing={isProcessingDocs}
          />
        </section>

        {/* Right Column: Agentic Chat & Generation */}
        <section className="glass-panel" style={{
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <ChatWindow
              messages={messages}
              isStreaming={isStreaming}
              streamingText={streamingText}
              streamingMetadata={streamingMetadata}
              onPromptClick={(prompt) => handleSendMessage(prompt)}
              onViewChunks={handleViewChunks}
              onClearChat={() => setMessages([])}
            />
          </div>

          <ChatInput
            onSendMessage={handleSendMessage}
            isLoading={isLoadingChat}
            currentModel={systemConfig?.current_llm_model}
            hasMessages={messages.length > 0}
            onClearChat={() => setMessages([])}
            disabled={!systemConfig?.groq_api_key_configured && documents.length === 0}
          />
        </section>
      </main>

      {/* Modals */}
      <ArchitectureModal
        isOpen={isArchOpen}
        onClose={() => setIsArchOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        systemConfig={systemConfig}
        retrievalSettings={retrievalSettings}
        onSaveSettings={handleSaveSettings}
      />

      <ChunkViewerModal
        isOpen={chunkModalData.isOpen}
        onClose={() => setChunkModalData((prev) => ({ ...prev, isOpen: false }))}
        chunks={chunkModalData.chunks}
        sourceFilter={chunkModalData.sourceFilter}
      />
    </div>
  );
}
