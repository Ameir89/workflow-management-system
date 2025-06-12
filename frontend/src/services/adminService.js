import { api } from "./authService";

export const adminService = {
  async getUsers(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(`/admin/users?${queryParams}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to fetch users");
    }
  },

  async createUser(userData) {
    try {
      const response = await api.post("/admin/users", userData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to create user");
    }
  },

  async updateUser(id, userData) {
    try {
      const response = await api.put(`/admin/users/${id}`, userData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to update user");
    }
  },

  async getRoles() {
    try {
      const response = await api.get("/admin/roles");
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to fetch roles");
    }
  },

  async createRole(roleData) {
    try {
      const response = await api.post("/admin/roles", roleData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to create role");
    }
  },

  async getSystemHealth() {
    try {
      const response = await api.get("/admin/health");
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch system health"
      );
    }
  },

  async getAuditLogs(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(`/admin/audit-logs?${queryParams}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch audit logs"
      );
    }
  },

  async getSystemConfig() {
    try {
      const response = await api.get("/admin/system-config");
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch system config"
      );
    }
  },

  async updateSystemConfig(config) {
    try {
      const response = await api.put("/admin/system-config", config);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to update system config"
      );
    }
  },
};
