import { api } from "./authService";

export const taskService = {
  async getTasks(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(`/tasks?${queryParams}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to fetch tasks");
    }
  },

  async getTask(id) {
    try {
      const response = await api.get(`/tasks/${id}`);
      return response.data.task;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to fetch task");
    }
  },

  async completeTask(id, result) {
    try {
      const response = await api.post(`/tasks/${id}/complete`, { result });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to complete task");
    }
  },

  async assignTask(id, assignedTo) {
    try {
      const response = await api.post(`/tasks/${id}/assign`, {
        assigned_to: assignedTo,
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to assign task");
    }
  },

  async submitFormResponse(taskId, formData) {
    try {
      const response = await api.post(`/tasks/${taskId}/form-response`, {
        form_data: formData,
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to submit form");
    }
  },

  async getDashboardStats() {
    try {
      const response = await api.get("/tasks/dashboard-stats");
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch dashboard stats"
      );
    }
  },
};
