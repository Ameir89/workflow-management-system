// src/services/adminService.js - Updated with all admin functionality
import { api } from "./authService";

export const adminService = {
  // Users Management
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

  async deleteUser(id) {
    try {
      const response = await api.delete(`/admin/users/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to delete user");
    }
  },

  async getUser(id) {
    try {
      const response = await api.get(`/admin/users/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to fetch user");
    }
  },

  // Roles Management
  async getRoles(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(`/admin/roles?${queryParams}`);
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

  async updateRole(id, roleData) {
    try {
      const response = await api.put(`/admin/roles/${id}`, roleData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to update role");
    }
  },

  async deleteRole(id) {
    try {
      const response = await api.delete(`/admin/roles/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to delete role");
    }
  },

  async getRole(id) {
    try {
      const response = await api.get(`/admin/roles/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to fetch role");
    }
  },

  // Permissions Management
  async getPermissions() {
    try {
      const response = await api.get("/admin/permissions");
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch permissions"
      );
    }
  },

  async getPermissionsByCategory() {
    try {
      const response = await api.get("/admin/permissions/by-category");
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch permissions by category"
      );
    }
  },

  // Role-User Assignments
  async assignRoleToUser(userId, roleId) {
    try {
      const response = await api.post(`/admin/users/${userId}/roles/${roleId}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to assign role to user"
      );
    }
  },

  async removeRoleFromUser(userId, roleId) {
    try {
      const response = await api.delete(
        `/admin/users/${userId}/roles/${roleId}`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to remove role from user"
      );
    }
  },

  async bulkAssignRoles(userId, roleIds) {
    try {
      const response = await api.put(`/admin/users/${userId}/roles`, {
        role_ids: roleIds,
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to assign roles to user"
      );
    }
  },

  // System Health
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

  async getSystemMetrics() {
    try {
      const response = await api.get("/admin/metrics");
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch system metrics"
      );
    }
  },

  // Audit Logs
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

  async getAuditLog(id) {
    try {
      const response = await api.get(`/admin/audit-logs/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch audit log"
      );
    }
  },

  async exportAuditLogs(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(
        `/admin/audit-logs/export?${queryParams}`,
        {
          responseType: "blob",
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to export audit logs"
      );
    }
  },

  // System Configuration
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

  async resetSystemConfig() {
    try {
      const response = await api.post("/admin/system-config/reset");
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to reset system config"
      );
    }
  },

  // Dashboard Statistics
  async getDashboardStats() {
    try {
      const response = await api.get("/admin/dashboard-stats");
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch dashboard stats"
      );
    }
  },

  // User Activity & Analytics
  async getUserActivity(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(`/admin/user-activity?${queryParams}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch user activity"
      );
    }
  },

  async getLoginHistory(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(`/admin/login-history?${queryParams}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch login history"
      );
    }
  },

  // System Maintenance
  async performSystemMaintenance(maintenanceType) {
    try {
      const response = await api.post("/admin/maintenance", {
        type: maintenanceType,
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to perform system maintenance"
      );
    }
  },

  async getMaintenanceStatus() {
    try {
      const response = await api.get("/admin/maintenance/status");
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch maintenance status"
      );
    }
  },

  // Backup & Restore
  async createBackup(backupOptions = {}) {
    try {
      const response = await api.post("/admin/backup", backupOptions);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to create backup");
    }
  },

  async getBackups(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(`/admin/backups?${queryParams}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to fetch backups");
    }
  },

  async restoreBackup(backupId) {
    try {
      const response = await api.post(`/admin/backups/${backupId}/restore`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to restore backup"
      );
    }
  },

  async deleteBackup(backupId) {
    try {
      const response = await api.delete(`/admin/backups/${backupId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to delete backup");
    }
  },

  // Email & Notifications
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

  async updateEmailTemplate(id, templateData) {
    try {
      const response = await api.put(
        `/admin/email-templates/${id}`,
        templateData
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to update email template"
      );
    }
  },

  async sendTestEmail(templateId, recipientEmail) {
    try {
      const response = await api.post(
        `/admin/email-templates/${templateId}/test`,
        {
          recipient: recipientEmail,
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to send test email"
      );
    }
  },

  // System Integrations
  async getIntegrations() {
    try {
      const response = await api.get("/admin/integrations");
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch integrations"
      );
    }
  },

  async updateIntegration(id, integrationData) {
    try {
      const response = await api.put(
        `/admin/integrations/${id}`,
        integrationData
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to update integration"
      );
    }
  },

  async testIntegration(id) {
    try {
      const response = await api.post(`/admin/integrations/${id}/test`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to test integration"
      );
    }
  },

  // Session Management
  async getActiveSessions(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(`/admin/sessions?${queryParams}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch active sessions"
      );
    }
  },

  async terminateSession(sessionId) {
    try {
      const response = await api.delete(`/admin/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to terminate session"
      );
    }
  },

  async terminateAllUserSessions(userId) {
    try {
      const response = await api.delete(`/admin/users/${userId}/sessions`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to terminate user sessions"
      );
    }
  },

  // Security & Compliance
  async getSecuritySettings() {
    try {
      const response = await api.get("/admin/security-settings");
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch security settings"
      );
    }
  },

  async updateSecuritySettings(settings) {
    try {
      const response = await api.put("/admin/security-settings", settings);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to update security settings"
      );
    }
  },

  async runSecurityScan() {
    try {
      const response = await api.post("/admin/security-scan");
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to run security scan"
      );
    }
  },

  async getComplianceReport(reportType = "full") {
    try {
      const response = await api.get(
        `/admin/compliance-report?type=${reportType}`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to generate compliance report"
      );
    }
  },

  // Bulk Operations
  async bulkDeleteUsers(userIds) {
    try {
      const response = await api.delete("/admin/users/bulk", {
        data: { user_ids: userIds },
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to bulk delete users"
      );
    }
  },

  async bulkUpdateUsers(userIds, updateData) {
    try {
      const response = await api.put("/admin/users/bulk", {
        user_ids: userIds,
        update_data: updateData,
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to bulk update users"
      );
    }
  },

  async bulkAssignRolesToUsers(userIds, roleIds) {
    try {
      const response = await api.post("/admin/users/bulk-assign-roles", {
        user_ids: userIds,
        role_ids: roleIds,
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to bulk assign roles"
      );
    }
  },

  // Import/Export
  async importUsers(csvFile, options = {}) {
    try {
      const formData = new FormData();
      formData.append("file", csvFile);
      Object.keys(options).forEach((key) => {
        formData.append(key, options[key]);
      });

      const response = await api.post("/admin/users/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to import users");
    }
  },

  async exportUsers(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(`/admin/users/export?${queryParams}`, {
        responseType: "blob",
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to export users");
    }
  },

  // API Key Management
  async getApiKeys(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(`/admin/api-keys?${queryParams}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch API keys"
      );
    }
  },

  async createApiKey(keyData) {
    try {
      const response = await api.post("/admin/api-keys", keyData);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to create API key"
      );
    }
  },

  async revokeApiKey(keyId) {
    try {
      const response = await api.delete(`/admin/api-keys/${keyId}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to revoke API key"
      );
    }
  },
};
