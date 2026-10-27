const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export const api = {
  // --- Documents ---
  async getDocuments() {
    const res = await fetch(`${API_BASE}/documents/`);
    if (!res.ok) throw new Error(`Failed to fetch documents: ${res.statusText}`);
    return await res.json();
  },

  async uploadDocuments(files) {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Upload failed');
    }
    return await res.json();
  },

  async addTextSnippet(text, title = '') {
    const res = await fetch(`${API_BASE}/documents/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, title }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Failed to add text snippet');
    }
    return await res.json();
  },

  async deleteDocument(filename) {
    const res = await fetch(`${API_BASE}/documents/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Failed to delete document: ${res.statusText}`);
    return await res.json();
  },

  async clearAllDocuments() {
    const res = await fetch(`${API_BASE}/documents/`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Failed to clear documents: ${res.statusText}`);
    return await res.json();
  },

  // --- Chat ---
  async sendChatMessage({ message, topK, fetchK, lambdaMmr, model }) {
    const res = await fetch(`${API_BASE}/chat/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        top_k: topK,
        fetch_k: fetchK,
        lambda_mmr: lambdaMmr,
        model,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Chat query failed');
    }
    return await res.json();
  },

  async streamChatMessage({ message, topK, fetchK, lambdaMmr, model, onMetadata, onToken, onDone, onError }) {
    try {
      const res = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          top_k: topK,
          fetch_k: fetchK,
          lambda_mmr: lambdaMmr,
          model,
        }),
      });

      if (!res.ok) {
        throw new Error(`Streaming failed with status: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const rawJson = line.substring(6).trim();
            if (!rawJson) continue;
            try {
              const data = JSON.parse(rawJson);
              if (data.type === 'metadata') {
                if (onMetadata) onMetadata(data);
              } else if (data.type === 'token') {
                if (onToken) onToken(data.content);
              } else if (data.type === 'done') {
                if (onDone) onDone();
              }
            } catch (err) {
              console.error('Error parsing SSE event:', err);
            }
          }
        }
      }
      if (onDone) onDone();
    } catch (err) {
      if (onError) onError(err);
    }
  },

  // --- System Config & Health ---
  async getConfig() {
    const res = await fetch(`${API_BASE}/config/`);
    if (!res.ok) throw new Error('Failed to fetch config');
    return await res.json();
  },

  async updateConfig({ groqApiKey, llmModel, topK, lambdaMmr }) {
    const res = await fetch(`${API_BASE}/config/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groq_api_key: groqApiKey,
        llm_model: llmModel,
        top_k: topK,
        lambda_mmr: lambdaMmr,
      }),
    });
    if (!res.ok) throw new Error('Failed to update config');
    return await res.json();
  },

  async getHealth() {
    const res = await fetch(`${API_BASE}/health/`);
    if (!res.ok) throw new Error('Health check failed');
    return await res.json();
  },
};
