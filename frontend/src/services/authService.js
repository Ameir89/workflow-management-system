import axios from "axios";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://127.0.0.1:5000";

// Create axios instance with interceptors
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        try {
          const response = await axios.post(
            `${API_BASE_URL}/api/auth/refresh`,
            {
              refresh_token: refreshToken,
            }
          );

          localStorage.setItem("access_token", response.data.access_token);

          // Retry original request
          error.config.headers.Authorization = `Bearer ${response.data.access_token}`;
          return api.request(error.config);
        } catch (refreshError) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/login";
        }
      } else {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  async login(credentials) {
    try {
      const response = await api.post("/auth/login", credentials);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Login failed");
    }
  },

  async logout() {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    }
  },

  async refreshToken(refreshToken) {
    try {
      const response = await api.post("/auth/refresh", {
        refresh_token: refreshToken,
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Token refresh failed");
    }
  },

  async getProfile() {
    try {
      const response = await api.get("/auth/profile");
      return response.data.user;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to get profile");
    }
  },

  async setup2FA() {
    try {
      const response = await api.post("/auth/setup-2fa");
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "2FA setup failed");
    }
  },

  async verify2FA(token) {
    try {
      const response = await api.post("/auth/verify-2fa", { token });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "2FA verification failed");
    }
  },
};

export const formsService = {
  async getForms(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(`/forms?${queryParams}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to fetch forms");
    }
  },

  async getForm(id) {
    try {
      const response = await api.get(`/forms/${id}`);
      return response.data.form;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to fetch form");
    }
  },

  async createForm(formData) {
    try {
      const response = await api.post("/forms", formData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to create form");
    }
  },

  async updateForm(id, formData) {
    try {
      const response = await api.put(`/forms/${id}`, formData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to update form");
    }
  },

  async deleteForm(id) {
    try {
      const response = await api.delete(`/forms/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to delete form");
    }
  },

  async getFormResponses(id, params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(`/forms/${id}/responses?${queryParams}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch form responses"
      );
    }
  },
};

export { api };

