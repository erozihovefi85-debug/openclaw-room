import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('procureai_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('procureai_token');
      localStorage.removeItem('procureai_auth_user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getCurrentUser: () => api.get('/auth/me'),
  updateProfile: (data) => api.patch('/auth/profile', data),
};

// Conversation APIs
export const conversationAPI = {
  getAll: (params) => api.get('/conversations', { params }),
  getById: (id) => api.get(`/conversations/${id}`),
  getMessages: (id, params) => api.get(`/conversations/${id}/messages`, { params }),
  delete: (id) => api.delete(`/conversations/${id}`),
};

// Agent Task APIs
export const agentTaskAPI = {
  getByConversation: (conversationId) => api.get(`/agent-tasks/${conversationId}`),
};

// Image Search APIs
export const imageSearchAPI = {
  search: (formData) => {
    const token = localStorage.getItem('procureai_token');
    return axios.post(`${API_BASE_URL}/image-search/search`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  batchSearch: (formData) => {
    const token = localStorage.getItem('procureai_token');
    return axios.post(`${API_BASE_URL}/image-search/batch`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getHistory: (params) => api.get('/image-search/history', { params }),
  getById: (id) => api.get(`/image-search/${id}`),
};

// Admin APIs
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params) => api.get('/admin/users', { params }),
  getUserById: (id) => api.get(`/admin/users/${id}`),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getConversations: (params) => api.get('/admin/conversations', { params }),
  getActivity: (params) => api.get('/admin/activity', { params }),
};

// Supplier APIs
export const supplierAPI = {
  // 基础 CRUD
  getAll: (params) => api.get('/suppliers', { params }),
  getById: (id) => api.get(`/suppliers/${id}`),
  create: (data) => api.post('/suppliers', data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`),

  // 批量操作
  batchCreate: (suppliers) => api.post('/suppliers/batch', { suppliers }),
  batchDelete: (ids) => api.post('/suppliers/batch-delete', { ids }),

  // 统计
  getStats: () => api.get('/suppliers/stats/overview'),

  // 约谈管理
  scheduleInterview: (id, data) => api.post(`/suppliers/${id}/interview`, data),
  updateInterviewResult: (id, data) => api.put(`/suppliers/${id}/interview-result`, data),

  // 导入导出
  import: (file) => {
    const token = localStorage.getItem('procureai_token');
    const formData = new FormData();
    formData.append('file', file);
    return axios.post(`${API_BASE_URL}/suppliers/import`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  export: () => {
    const token = localStorage.getItem('procureai_token');
    return axios.get(`${API_BASE_URL}/suppliers/export`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      responseType: 'blob',
    });
  },
};

// Product Wishlist APIs
export const productWishlistAPI = {
  // 基础 CRUD
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),

  // 批量操作
  batchCreate: (products) => api.post('/products/batch', { products }),
  batchDelete: (ids) => api.post('/products/batch-delete', { ids }),

  // 统计
  getStats: () => api.get('/products/stats/overview'),

  // 订单状态更新
  updateStatus: (id, data) => api.put(`/products/${id}/status`, data),

  // 导入导出
  import: (file) => {
    const token = localStorage.getItem('procureai_token');
    const formData = new FormData();
    formData.append('file', file);
    return axios.post(`${API_BASE_URL}/products/import`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  export: () => {
    const token = localStorage.getItem('procureai_token');
    return axios.get(`${API_BASE_URL}/products/export`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      responseType: 'blob',
    });
  },
};

// Requirement List APIs
export const requirementListAPI = {
  // 生成需求清单Excel
  generate: (data) => {
    const token = localStorage.getItem('procureai_token');
    return axios.post(`${API_BASE_URL}/requirement-list/generate`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      responseType: 'blob',
    });
  },

  // 解析上传的需求清单Excel
  parse: (file) => {
    const token = localStorage.getItem('procureai_token');
    const formData = new FormData();
    formData.append('file', file);
    return axios.post(`${API_BASE_URL}/requirement-list/parse`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // 获取需求清单模板
  getTemplate: () => {
    const token = localStorage.getItem('procureai_token');
    return axios.get(`${API_BASE_URL}/requirement-list/template`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      responseType: 'blob',
    });
  },
};

// Chat Streaming API
export const chatAPI = {
  stream: (data, onChunk, onEnd, onError, onNodeChange, onTaskEvent) => {
    const token = localStorage.getItem('procureai_token');
    const formData = new FormData();

    Object.keys(data).forEach(key => {
      if (key !== 'files') {
        formData.append(key, data[key]);
      }
    });

    if (data.files && data.files.length > 0) {
      data.files.forEach(file => {
        formData.append('files', file);
      });
    }

    return fetch(`${API_BASE_URL}/chat/stream`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }).then(async (response) => {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const data = JSON.parse(jsonStr);

              if (data.type === 'chunk') {
                onChunk(data.content);
              } else if (data.type === 'end') {
                onEnd(data.conversationId, data.generatedFiles);
              } else if (data.type === 'error') {
                onError(data.error);
              } else if (data.type === 'node') {
                onNodeChange(data.nodeName);
              } else if (data.type === 'task' && onTaskEvent) {
                onTaskEvent(data.payload);
              }
            } catch (e) {
              console.warn("Failed to parse SSE data", e);
            }
          }
        }
      }
    });
  },
};

// User Preference APIs
export const userPreferenceAPI = {
  getAll: () => api.get('/user-preferences'),
  update: (data) => api.patch('/user-preferences', data),
  reset: () => api.delete('/user-preferences/reset'),
};

export default api;
