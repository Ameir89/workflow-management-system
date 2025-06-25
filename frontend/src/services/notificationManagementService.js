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

  async getSettings() {
    try {
      const response = await api.get("/admin/notification-settings");
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch notification settings"
      );
    }
  },

  async updateSettings(settings) {
    try {
      const response = await api.put("/admin/notification-settings", settings);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to update notification settings"
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

  // Other methods from the original service
  async getNotificationTemplates(params = {}) {
    return this.getTemplates(params);
  },

  async getNotificationTemplate(id) {
    return this.getTemplate(id);
  },

  async createNotificationTemplate(templateData) {
    return this.createTemplate(templateData);
  },

  async updateNotificationTemplate(id, templateData) {
    return this.updateTemplate(id, templateData);
  },

  async deleteNotificationTemplate(id) {
    return this.deleteTemplate(id);
  },

  // Notification Rules Management
  async getNotificationRules(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(
        `/admin/notification-rules?${queryParams}`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch notification rules"
      );
    }
  },

  async getNotificationRule(id) {
    try {
      const response = await api.get(`/admin/notification-rules/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch notification rule"
      );
    }
  },

  async createNotificationRule(ruleData) {
    try {
      const response = await api.post("/admin/notification-rules", ruleData);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to create notification rule"
      );
    }
  },

  async updateNotificationRule(id, ruleData) {
    try {
      const response = await api.put(
        `/admin/notification-rules/${id}`,
        ruleData
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to update notification rule"
      );
    }
  },

  async deleteNotificationRule(id) {
    try {
      const response = await api.delete(`/admin/notification-rules/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to delete notification rule"
      );
    }
  },

  async toggleNotificationRule(id, enabled) {
    try {
      const response = await api.patch(
        `/admin/notification-rules/${id}/toggle`,
        {
          enabled,
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to toggle notification rule"
      );
    }
  },

  // User Notification Preferences
  async getUserNotificationPreferences(userId) {
    try {
      const response = await api.get(
        `/admin/users/${userId}/notification-preferences`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error ||
          "Failed to fetch user notification preferences"
      );
    }
  },

  async updateUserNotificationPreferences(userId, preferences) {
    try {
      const response = await api.put(
        `/admin/users/${userId}/notification-preferences`,
        preferences
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error ||
          "Failed to update user notification preferences"
      );
    }
  },

  async resetUserNotificationPreferences(userId) {
    try {
      const response = await api.post(
        `/admin/users/${userId}/notification-preferences/reset`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error ||
          "Failed to reset user notification preferences"
      );
    }
  },

  // Notification Channels Management
  async getNotificationChannels() {
    try {
      const response = await api.get("/admin/notification-channels");
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch notification channels"
      );
    }
  },

  async createNotificationChannel(channelData) {
    try {
      const response = await api.post(
        "/admin/notification-channels",
        channelData
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to create notification channel"
      );
    }
  },

  async updateNotificationChannel(id, channelData) {
    try {
      const response = await api.put(
        `/admin/notification-channels/${id}`,
        channelData
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to update notification channel"
      );
    }
  },

  async deleteNotificationChannel(id) {
    try {
      const response = await api.delete(`/admin/notification-channels/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to delete notification channel"
      );
    }
  },

  async testNotificationChannel(id, testData = {}) {
    try {
      const response = await api.post(
        `/admin/notification-channels/${id}/test`,
        testData
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to test notification channel"
      );
    }
  },

  // Bulk Operations
  async bulkSendNotifications(notificationData) {
    try {
      const response = await api.post(
        "/admin/notifications/bulk-send",
        notificationData
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to send bulk notifications"
      );
    }
  },

  async bulkDeleteNotifications(notificationIds) {
    try {
      const response = await api.delete("/admin/notifications/bulk-delete", {
        data: { notification_ids: notificationIds },
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to bulk delete notifications"
      );
    }
  },

  async bulkMarkAsRead(notificationIds) {
    try {
      const response = await api.put("/admin/notifications/bulk-read", {
        notification_ids: notificationIds,
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error ||
          "Failed to bulk mark notifications as read"
      );
    }
  },

  // System Notifications
  async createSystemNotification(notificationData) {
    try {
      const response = await api.post(
        "/admin/system-notifications",
        notificationData
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to create system notification"
      );
    }
  },

  async getSystemNotifications(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(
        `/admin/system-notifications?${queryParams}`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch system notifications"
      );
    }
  },

  async updateSystemNotification(id, notificationData) {
    try {
      const response = await api.put(
        `/admin/system-notifications/${id}`,
        notificationData
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to update system notification"
      );
    }
  },

  async deleteSystemNotification(id) {
    try {
      const response = await api.delete(`/admin/system-notifications/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to delete system notification"
      );
    }
  },

  // Email-specific operations
  async getEmailTemplates(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(`/admin/email-templates?${queryParams}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch email templates"
      );
    }
  },

  async previewEmailTemplate(templateId, previewData = {}) {
    try {
      const response = await api.post(
        `/admin/email-templates/${templateId}/preview`,
        previewData
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to preview email template"
      );
    }
  },

  async sendTestEmail(templateId, recipientEmail, testData = {}) {
    try {
      const response = await api.post(
        `/admin/email-templates/${templateId}/test`,
        {
          recipient: recipientEmail,
          test_data: testData,
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to send test email"
      );
    }
  },

  // Export/Import operations
  async exportNotificationData(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(
        `/admin/notifications/export?${queryParams}`,
        {
          responseType: "blob",
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to export notification data"
      );
    }
  },

  async importNotificationTemplates(file) {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post(
        "/admin/notification-templates/import",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to import notification templates"
      );
    }
  },
};
