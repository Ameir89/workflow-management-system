// src/services/workflowService.js - Updated to include missing methods
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

  // ADD THIS MISSING METHOD
  async getAllWorkflowInstances(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(`/workflows/instances?${queryParams}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch all workflow instances"
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

  // Instance control methods
  async pauseWorkflowInstance(instanceId) {
    try {
      const response = await api.post(
        `/workflows/instances/${instanceId}/pause`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to pause workflow instance"
      );
    }
  },

  async resumeWorkflowInstance(instanceId) {
    try {
      const response = await api.post(
        `/workflows/instances/${instanceId}/resume`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to resume workflow instance"
      );
    }
  },

  async cancelWorkflowInstance(instanceId) {
    try {
      const response = await api.post(
        `/workflows/instances/${instanceId}/cancel`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to cancel workflow instance"
      );
    }
  },

  // Workflow activation/deactivation
  async activateWorkflow(id) {
    try {
      const response = await api.post(`/workflows/${id}/activate`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to activate workflow"
      );
    }
  },

  async deactivateWorkflow(id) {
    try {
      const response = await api.post(`/workflows/${id}/deactivate`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to deactivate workflow"
      );
    }
  },

  async getDashboardStats(workflowId = null) {
    try {
      // If no workflowId is provided or it's null/undefined, get general stats
      if (!workflowId || workflowId === null || workflowId === undefined) {
        const response = await api.get("/workflows/dashboard-stats");
        return response.data;
      } else {
        // Get stats for specific workflow
        const response = await api.get(`/workflows/${workflowId}/stats`);
        return response.data;
      }
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch dashboard stats"
      );
    }
  },

  // Recent and favorite workflows
  async getRecentWorkflows(limit = 10) {
    try {
      const response = await api.get(`/workflows/recent?limit=${limit}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch recent workflows"
      );
    }
  },

  async getFavoriteWorkflows() {
    try {
      const response = await api.get("/workflows/favorites");
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch favorite workflows"
      );
    }
  },

  async addToFavorites(workflowId) {
    try {
      const response = await api.post(`/workflows/${workflowId}/favorite`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to add workflow to favorites"
      );
    }
  },

  async removeFromFavorites(workflowId) {
    try {
      const response = await api.delete(`/workflows/${workflowId}/favorite`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error ||
          "Failed to remove workflow from favorites"
      );
    }
  },

  // Templates
  async getWorkflowTemplates(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(`/workflows/templates?${queryParams}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch workflow templates"
      );
    }
  },
};
