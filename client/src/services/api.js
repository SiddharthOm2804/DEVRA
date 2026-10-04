import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json"
  }
});

// Request Interceptor: Attach JWT Bearer Token if available
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("devra_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle global unauthorized / expired token
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Optional: Clear token if session is invalid
      const currentPath = window.location.pathname;
      if (currentPath !== "/login" && currentPath !== "/register" && currentPath !== "/") {
        localStorage.removeItem("devra_token");
        localStorage.removeItem("devra_user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Authentication API Service
 */
export const authApi = {
  register: async (userData) => {
    const response = await apiClient.post("/api/auth/register", userData);
    return response.data;
  },
  login: async (credentials) => {
    const response = await apiClient.post("/api/auth/login", credentials);
    return response.data;
  },
  getMe: async () => {
    const response = await apiClient.get("/api/auth/me");
    return response.data;
  },
  logout: async () => {
    const response = await apiClient.post("/api/auth/logout");
    return response.data;
  },
  getGithubAuthUrl: async (mode = "login", redirect = "") => {
    const params = new URLSearchParams({ mode });
    if (redirect) params.append("redirect", redirect);
    const response = await apiClient.get(`/api/auth/github/url?${params.toString()}`);
    return response.data;
  }
};

/**
 * System Health Check Service
 */
export const checkHealth = async () => {
  try {
    const response = await apiClient.get("/api/health");
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message || "Failed to reach server"
    };
  }
};

/**
 * Repository API Service
 */
export const repositoryApi = {
  getAll: async (params = {}) => {
    const response = await apiClient.get("/api/repositories", { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await apiClient.get(`/api/repositories/${id}`);
    return response.data;
  },
  create: async (repoData) => {
    const response = await apiClient.post("/api/repositories", repoData);
    return response.data;
  },
  update: async (id, updateData) => {
    const response = await apiClient.put(`/api/repositories/${id}`, updateData);
    return response.data;
  },
  delete: async (id) => {
    const response = await apiClient.delete(`/api/repositories/${id}`);
    return response.data;
  },
  sync: async (id) => {
    const response = await apiClient.post(`/api/repositories/${id}/sync`);
    return response.data;
  },
  seed: async () => {
    const response = await apiClient.post("/api/repositories/seed");
    return response.data;
  },
  getGithubStatus: async () => {
    const response = await apiClient.get("/api/repositories/github/status");
    return response.data;
  },
  getAvailableGithubRepos: async () => {
    const response = await apiClient.get("/api/repositories/github/repos");
    return response.data;
  },
  connectGithubRepo: async (repoData) => {
    const response = await apiClient.post("/api/repositories/github/connect-repo", repoData);
    return response.data;
  },
  connectGithubAccount: async (payload) => {
    const response = await apiClient.post("/api/repositories/github/connect-account", payload);
    return response.data;
  },
  disconnectGithubAccount: async () => {
    const response = await apiClient.post("/api/repositories/github/disconnect");
    return response.data;
  }
};

/**
 * Codebase Analysis API Service
 */
export const analysisApi = {
  trigger: async (repositoryId) => {
    const response = await apiClient.post(`/api/analysis/${repositoryId}`);
    return response.data;
  },
  get: async (repositoryId) => {
    const response = await apiClient.get(`/api/analysis/${repositoryId}`);
    return response.data;
  }
};

/**
 * AI Code Review API Service
 */
export const reviewApi = {
  generate: async (payload) => {
    const response = await apiClient.post("/api/reviews/generate", payload);
    return response.data;
  },
  getAll: async (params = {}) => {
    const response = await apiClient.get("/api/reviews", { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await apiClient.get(`/api/reviews/${id}`);
    return response.data;
  },
  delete: async (id) => {
    const response = await apiClient.delete(`/api/reviews/${id}`);
    return response.data;
  }
};

/**
 * Codebase RAG Chat API Service
 */
export const chatApi = {
  sendMessage: async (payload) => {
    const response = await apiClient.post("/api/chat/message", payload);
    return response.data;
  },
  getHistory: async (repositoryId) => {
    const response = await apiClient.get(`/api/chat/history/${repositoryId}`);
    return response.data;
  },
  clearHistory: async (repositoryId) => {
    const response = await apiClient.delete(`/api/chat/history/${repositoryId}`);
    return response.data;
  }
};

/**
 * AI Agent Mode API Service
 */
export const agentApi = {
  createPlan: async (payload) => {
    const response = await apiClient.post("/api/agent/plan", payload);
    return response.data;
  },
  approvePlan: async (sessionId) => {
    const response = await apiClient.post(`/api/agent/${sessionId}/approve-plan`);
    return response.data;
  },
  applyChanges: async (sessionId) => {
    const response = await apiClient.post(`/api/agent/${sessionId}/apply`);
    return response.data;
  },
  rejectChanges: async (sessionId, reason = "User rejected proposed changes") => {
    const response = await apiClient.post(`/api/agent/${sessionId}/reject`, { reason });
    return response.data;
  },
  getSession: async (sessionId) => {
    const response = await apiClient.get(`/api/agent/${sessionId}`);
    return response.data;
  },
  listSessions: async (params = {}) => {
    const response = await apiClient.get("/api/agent", { params });
    return response.data;
  }
};






