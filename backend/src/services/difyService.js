import axios from 'axios';

const DIFY_API_BASE = process.env.DIFY_API_BASE || 'https://api.dify.ai/v1';

// API Key mapping for different contexts
const getApiKeyFromEnv = (contextId) => {
  const API_KEYS = {
    'casual_main': process.env.DIFY_API_KEY_CASUAL,
    'standard_keyword': process.env.DIFY_API_KEY_KEYWORD,
    'standard_docgen': process.env.DIFY_API_KEY_DOCGEN,
    'standard_supplier': process.env.DIFY_API_KEY_SUPPLIER,
    'standard_price': process.env.DIFY_API_KEY_PRICE,
  };
  return API_KEYS[contextId] || API_KEYS['casual_main'];
};

export const getApiKey = (contextId) => {
  const key = getApiKeyFromEnv(contextId);
  console.log('getApiKey called with contextId:', contextId, '-> key:', key?.substring(0, 20));
  return key;
};

export const uploadFile = async (file, userId) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('user', userId);

  const response = await axios.post(`${DIFY_API_BASE}/files/upload`, formData, {
    headers: {
      'Authorization': `Bearer ${process.env.DIFY_API_KEY_CASUAL}`,
    },
  });

  return response.data;
};

export const streamChatMessage = async (
  query,
  conversationId,
  files,
  userId,
  apiKey,
  onChunk,
  onEnd,
  onError,
  onNodeChange,
  onWorkflowEvent,
  inputs = {} // 🆕 支持传递用户偏好给Dify工作流
) => {
  const filesPayload = files.map(f => ({
    type: getFileType(f.name),
    transfer_method: 'local_file',
    upload_file_id: f.id,
  }));

  try {
    const response = await axios.post(
      `${DIFY_API_BASE}/chat-messages`,
      {
        inputs: inputs || {}, // 🆕 传递用户偏好
        query: query || ' ',
        response_mode: 'streaming',
        conversation_id: conversationId,
        user: userId,
        files: filesPayload,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        responseType: 'stream',
      }
    );

    let buffer = '';
    response.data.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const data = JSON.parse(jsonStr);

            if ((data.event === 'message' || data.event === 'agent_message') && data.answer) {
              onChunk(data.answer);
            }

            if (data.event === 'node_started' && onNodeChange) {
              const title = data.data?.title || data.data?.node_type || 'Processing';
              onNodeChange(title);
            }

            if (onWorkflowEvent && ['workflow_started', 'node_started', 'node_finished', 'workflow_finished'].includes(data.event)) {
              onWorkflowEvent(data);
            }

            if (data.event === 'message_end' || data.event === 'workflow_finished') {
              const generatedFiles = data.files || data.data?.files;
              onEnd(data.conversation_id, generatedFiles);
            }

            if (data.event === 'error') {
              onError(data.message || data.code || 'Workflow error occurred.');
            }
          } catch (e) {
            console.warn("Failed to parse SSE data", e);
          }
        }
      }
    });

    response.data.on('error', (error) => {
      console.error('Dify stream error:', error);
      onError(error.message);
    });

  } catch (error) {
    console.error('Dify API request error:', error.response?.status, error.response?.statusText);
    console.error('Response data:', error.response?.data);
    console.error('Request config:', {
      url: error.config?.url,
      method: error.config?.method,
      headers: error.config?.headers
    });
    onError(error.message);
  }
};

export const fetchConversations = async (userId, apiKey) => {
  const response = await axios.get(
    `${DIFY_API_BASE}/conversations?user=${userId}&limit=20`,
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    }
  );
  return response.data.data;
};

export const fetchMessages = async (conversationId, userId, apiKey) => {
  const response = await axios.get(
    `${DIFY_API_BASE}/messages?conversation_id=${conversationId}&user=${userId}&limit=100`,
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    }
  );

  const messages = [];
  const rawMessages = (response.data.data || []).reverse();

  for (const item of rawMessages) {
    messages.push({
      id: item.id + '_user',
      role: 'user',
      content: item.query,
      created_at: item.created_at,
      files: item.message_files ? item.message_files.map(f => ({
        id: f.id,
        name: f.filename || 'file',
        size: f.size || 0,
      })) : [],
    });

    if (item.answer) {
      messages.push({
        id: item.id + '_assistant',
        role: 'assistant',
        content: item.answer,
        created_at: item.created_at,
        generated_files: item.message_files?.filter(f =>
          f.transfer_method === 'tool_file' || f.type === 'document'
        ),
      });
    }
  }

  return messages;
};

export const deleteConversation = async (conversationId, userId, apiKey) => {
  await axios.delete(
    `${DIFY_API_BASE}/conversations/${conversationId}`,
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      data: { user: userId },
    }
  );
};

const getFileType = (fileName) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
  const videoExts = ['mp4', 'mov', 'mpeg', 'webm'];
  const audioExts = ['mp3', 'm4a', 'wav', 'webm', 'mpga'];
  if (imageExts.includes(ext)) return 'image';
  if (videoExts.includes(ext)) return 'video';
  if (audioExts.includes(ext)) return 'audio';
  return 'document';
};
