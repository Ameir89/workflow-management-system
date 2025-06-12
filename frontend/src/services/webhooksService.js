import { api } from "./authService";

export const webhooksService = {
  async getWebhooks(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(`/webhooks?${queryParams}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch webhooks"
      );
    }
  },

  async getWebhook(id) {
    try {
      const response = await api.get(`/webhooks/${id}`);
      return response.data.webhook;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to fetch webhook");
    }
  },

  async createWebhook(webhookData) {
    try {
      const response = await api.post("/webhooks", webhookData);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to create webhook"
      );
    }
  },

  async updateWebhook(id, webhookData) {
    try {
      const response = await api.put(`/webhooks/${id}`, webhookData);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to update webhook"
      );
    }
  },

  async deleteWebhook(id) {
    try {
      const response = await api.delete(`/webhooks/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to delete webhook"
      );
    }
  },

  async testWebhook(id) {
    try {
      const response = await api.post(`/webhooks/${id}/test`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to test webhook");
    }
  },

  async getWebhookDeliveries(id, params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(
        `/webhooks/${id}/deliveries?${queryParams}`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch webhook deliveries"
      );
    }
  },
};
