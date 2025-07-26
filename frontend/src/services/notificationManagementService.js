import { api } from "./authService";

export const notificationManagementService = {
  // Template management methods aligned with component usage
  async getTemplates(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(
        `/admin/notification-templates?${queryParams}`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch notification templates"
      );
    }
  },

  async getTemplate(id) {
    try {
      const response = await api.get(`/admin/notification-templates/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch notification template"
      );
    }
  },

  async createTemplate(templateData) {
    try {
      const response = await api.post(
        "/admin/notification-templates",
        templateData
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to create notification template"
      );
    }
  },

  async updateTemplate(id, templateData) {
    try {
      const response = await api.put(
        `/admin/notification-templates/${id}`,
        templateData
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to update notification template"
      );
    }
  },

  async deleteTemplate(id) {
    try {
      const response = await api.delete(`/admin/notification-templates/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to delete notification template"
      );
    }
  },

  async testTemplate(id, testData) {
    try {
      const response = await api.post(
        `/admin/notification-templates/${id}/test`,
        testData
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to test notification template"
      );
    }
  },

  // History and analytics methods
  async getNotificationHistory(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(
        `/admin/notifications/history?${queryParams}`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch notification history"
      );
    }
  },

  async getAnalytics(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(
        `/admin/notifications/analytics?${queryParams}`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch notification analytics"
      );
    }
  },

  // Bulk operations
  async bulkOperations(operation, ids) {
    try {
      const response = await api.post("/admin/notification-templates/bulk", {
        operation,
        template_ids: ids,
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || `Failed to perform bulk ${operation}`
      );
    }
  },
};
