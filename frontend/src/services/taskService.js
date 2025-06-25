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

  async updateTaskStatus(id, statusData) {
    try {
      const response = await api.put(`/tasks/${id}/status`, statusData);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to update task status"
      );
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

  async addTaskComment(taskId, comment) {
    try {
      const response = await api.post(`/tasks/${taskId}/comments`, {
        comment,
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to add comment");
    }
  },

  async getTaskComments(taskId, params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(
        `/tasks/${taskId}/comments?${queryParams}`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch comments"
      );
    }
  },

  async getTaskHistory(taskId) {
    try {
      const response = await api.get(`/tasks/${taskId}/history`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch task history"
      );
    }
  },

  async updateTask(id, taskData) {
    try {
      const response = await api.put(`/tasks/${id}`, taskData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to update task");
    }
  },

  async deleteTask(id) {
    try {
      const response = await api.delete(`/tasks/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to delete task");
    }
  },

  async claimTask(id) {
    try {
      const response = await api.post(`/tasks/${id}/claim`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to claim task");
    }
  },

  async releaseTask(id) {
    try {
      const response = await api.post(`/tasks/${id}/release`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to release task");
    }
  },

  async escalateTask(id, escalationData) {
    try {
      const response = await api.post(`/tasks/${id}/escalate`, escalationData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || "Failed to escalate task");
    }
  },

  async getTasksByUser(userId, params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(`/users/${userId}/tasks?${queryParams}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch user tasks"
      );
    }
  },

  async getMyTasks(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(`/tasks/my-tasks?${queryParams}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch my tasks"
      );
    }
  },

  async bulkUpdateTasks(taskIds, updateData) {
    try {
      const response = await api.put("/tasks/bulk-update", {
        task_ids: taskIds,
        update_data: updateData,
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to bulk update tasks"
      );
    }
  },

  async getTaskAttachments(taskId) {
    try {
      const response = await api.get(`/tasks/${taskId}/attachments`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch task attachments"
      );
    }
  },

  async addTaskAttachment(taskId, file, metadata = {}) {
    try {
      const formData = new FormData();
      formData.append("file", file);
      Object.keys(metadata).forEach((key) => {
        formData.append(key, metadata[key]);
      });

      const response = await api.post(
        `/tasks/${taskId}/attachments`,
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
        error.response?.data?.error || "Failed to add attachment"
      );
    }
  },

  async removeTaskAttachment(taskId, attachmentId) {
    try {
      const response = await api.delete(
        `/tasks/${taskId}/attachments/${attachmentId}`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to remove attachment"
      );
    }
  },
};
