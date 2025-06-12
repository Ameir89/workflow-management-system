import { api } from "./authService";

export const workflowService = {
  async getWorkflows(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(`/workflows?${queryParams}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch workflows"
      );
    }
  },

  async getWorkflow(id) {
    try {
      const response = await api.get(`/workflows/${id}`);
      return response.data.workflow;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch workflow"
      );
    }
  },

  async createWorkflow(workflow) {
    try {
      const response = await api.post("/workflows", workflow);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to create workflow"
      );
    }
  },

  async updateWorkflow(id, workflow) {
    try {
      const response = await api.put(`/workflows/${id}`, workflow);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to update workflow"
      );
    }
  },

  async deleteWorkflow(id) {
    try {
      const response = await api.delete(`/workflows/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to delete workflow"
      );
    }
  },

  async executeWorkflow(id, data) {
    try {
      const response = await api.post(`/workflows/${id}/execute`, { data });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to execute workflow"
      );
    }
  },

  async getWorkflowInstances(id, params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(
        `/workflows/${id}/instances?${queryParams}`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch workflow instances"
      );
    }
  },

  async getWorkflowInstance(id) {
    try {
      const response = await api.get(`/workflows/instances/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch workflow instance"
      );
    }
  },

  async getDashboardStats() {
    try {
      const response = await api.get("/reports/dashboard-stats");
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch dashboard stats"
      );
    }
  },
};
