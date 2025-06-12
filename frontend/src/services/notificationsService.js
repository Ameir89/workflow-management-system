import { api } from "./authService";

export const notificationsService = {
  async getNotifications(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(`/notifications?${queryParams}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch notifications"
      );
    }
  },

  async markNotificationRead(id) {
    try {
      const response = await api.put(`/notifications/${id}/read`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to mark notification as read"
      );
    }
  },

  async markAllNotificationsRead() {
    try {
      const response = await api.put("/notifications/mark-all-read");
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error ||
          "Failed to mark all notifications as read"
      );
    }
  },

  async deleteNotification(id) {
    try {
      const response = await api.delete(`/notifications/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to delete notification"
      );
    }
  },

  async getNotificationStats() {
    try {
      const response = await api.get("/notifications/stats");
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch notification stats"
      );
    }
  },
};
