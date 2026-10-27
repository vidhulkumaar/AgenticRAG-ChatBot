const getApiBase = () => {
  const envUrl = (import.meta.env.VITE_API_BASE_URL || '/api').trim();
  let url = envUrl.replace(/\/+$/, '');
  if (url.startsWith('http') && !url.endsWith('/api')) {
    url = `${url}/api`;
  }
  return url;
};

const API_BASE = getApiBase();

async function safeParseResponse(res, defaultErrorMsg = 'Request failed') {
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }

  if (!res.ok) {
    if (data && (data.detail || data.message)) {
      throw new Error(data.detail || data.message);
    }
    if (res.status === 502) {
      throw new Error('Backend server is temporarily unavailable or restarting (502 Bad Gateway). Please retry in a moment.');
    }
    if (res.status === 504) {
      throw new Error('Server request timed out (504 Gateway Timeout). The server may be busy or the file too large.');
    }
    if (res.status === 413) {
      throw new Error('File exceeds the server maximum upload limit (413 Payload Too Large).');
    }
    throw new Error(`${defaultErrorMsg} (${res.status}): ${res.statusText || 'Server error'}`);
  }

  if (data === null) {
    throw new Error(`Invalid server response (${res.status}): Expected JSON but received HTML.`);
  }

  return data;
}

export const api = {
  // --- Documents ---
  async getDocuments() {
    const res = await fetch(`${API_BASE}/documents/`);
    return await safeParseResponse(res, 'Failed to fetch documents');
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
    return await safeParseResponse(res, 'Upload failed');
  },

  async addTextSnippet(text, title = '') {
    const res = await fetch(`${API_BASE}/documents/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, title }),
    });
    return await safeParseResponse(res, 'Failed to add text snippet');
  },

  async deleteDocument(filename) {
    const res = await fetch(`${API_BASE}/documents/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    });
    return await safeParseResponse(res, `Failed to delete document '${filename}'`);
  },

  async clearAllDocuments() {
    const res = await fetch(`${API_BASE}/documents/`, {
      method: 'DELETE',
    });
    return await safeParseResponse(res, 'Failed to clear documents');
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
    return await safeParseResponse(res, 'Chat query failed');
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
    return await safeParseResponse(res, 'Failed to fetch config');
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
    return await safeParseResponse(res, 'Failed to update config');
  },

  async getHealth() {
    const res = await fetch(`${API_BASE}/health/`);
    return await safeParseResponse(res, 'Health check failed');
  },
};
