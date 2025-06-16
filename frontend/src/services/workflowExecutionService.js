// src/services/workflowExecutionService.js
import { api } from "./authService";

export const workflowExecutionService = {
  /**
   * Start a new workflow instance with comprehensive configuration
   */
  async startWorkflowInstance(workflowId, config = {}) {
    try {
      const payload = {
        // Basic instance configuration
        title:
          config.title || `Workflow Instance - ${new Date().toLocaleString()}`,
        description: config.description || "",
        priority: config.priority || "medium",

        // Timing configuration
        due_date: config.due_date || null,
        scheduled_start: config.scheduled_start || null,

        // Assignment configuration
        initial_assignee: config.assignee_email || null,
        notify_stakeholders: config.notify_stakeholders !== false,

        // Custom data and context
        data: {
          // Merge custom data with workflow configuration
          ...config.custom_data,

          // Instance metadata
          started_by: config.started_by || "user",
          start_reason: config.start_reason || "manual",

          // Business context
          department: config.department || null,
          cost_center: config.cost_center || null,
          project_id: config.project_id || null,

          // Any additional fields from the form
          ...config.additional_fields,
        },

        // Execution options
        execution_options: {
          auto_assign: config.auto_assign !== false,
          skip_validations: config.skip_validations === true,
          parallel_execution: config.parallel_execution === true,
          timeout_minutes: config.timeout_minutes || 0, // 0 = no timeout
        },
      };

      const response = await api.post(
        `/workflows/${workflowId}/execute`,
        payload
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to start workflow instance"
      );
    }
  },

  /**
   * Quick start with minimal configuration
   */
  async quickStartWorkflow(workflowId, title = null) {
    return this.startWorkflowInstance(workflowId, {
      title: title || `Quick Start - ${new Date().toLocaleString()}`,
      priority: "medium",
      notify_stakeholders: false,
      auto_assign: true,
    });
  },

  /**
   * Batch start multiple workflow instances
   */
  async batchStartWorkflows(requests) {
    try {
      const response = await api.post("/workflows/batch-execute", {
        requests: requests.map((req) => ({
          workflow_id: req.workflowId,
          ...req.config,
        })),
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to batch start workflows"
      );
    }
  },

  /**
   * Schedule a workflow to start at a specific time
   */
  async scheduleWorkflow(workflowId, scheduleTime, config = {}) {
    try {
      const payload = {
        ...config,
        scheduled_start: scheduleTime,
        status: "scheduled",
      };

      const response = await api.post(
        `/workflows/${workflowId}/schedule`,
        payload
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to schedule workflow"
      );
    }
  },

  /**
   * Get workflow execution templates
   */
  async getExecutionTemplates(workflowId) {
    try {
      const response = await api.get(
        `/workflows/${workflowId}/execution-templates`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch execution templates"
      );
    }
  },

  /**
   * Create a new execution template
   */
  async createExecutionTemplate(workflowId, templateData) {
    try {
      const response = await api.post(
        `/workflows/${workflowId}/execution-templates`,
        templateData
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to create execution template"
      );
    }
  },

  /**
   * Validate workflow before execution
   */
  async validateWorkflowExecution(workflowId, config = {}) {
    try {
      const response = await api.post(
        `/workflows/${workflowId}/validate-execution`,
        config
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to validate workflow execution"
      );
    }
  },

  /**
   * Get execution history and statistics
   */
  async getExecutionHistory(workflowId, params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(
        `/workflows/${workflowId}/execution-history?${queryParams}`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch execution history"
      );
    }
  },

  /**
   * Clone an existing workflow instance with new configuration
   */
  async cloneWorkflowInstance(instanceId, newConfig = {}) {
    try {
      const response = await api.post(
        `/workflows/instances/${instanceId}/clone`,
        newConfig
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to clone workflow instance"
      );
    }
  },

  /**
   * Get workflow execution recommendations based on history
   */
  async getExecutionRecommendations(workflowId) {
    try {
      const response = await api.get(
        `/workflows/${workflowId}/execution-recommendations`
      );
      return response.data;
    } catch (error) {
      // Non-critical feature, return empty recommendations on failure
      console.warn("Failed to fetch execution recommendations:", error);
      return { recommendations: [] };
    }
  },

  /**
   * Bulk operations on workflow instances
   */
  async bulkOperations(operation, instanceIds, params = {}) {
    try {
      const response = await api.post("/workflows/instances/bulk-operation", {
        operation,
        instance_ids: instanceIds,
        parameters: params,
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || `Failed to perform bulk ${operation}`
      );
    }
  },

  /**
   * Get workflow execution metrics and analytics
   */
  async getExecutionMetrics(workflowId, timeRange = "30d") {
    try {
      const response = await api.get(`/workflows/${workflowId}/metrics`, {
        params: { time_range: timeRange },
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.error || "Failed to fetch execution metrics"
      );
    }
  },
};

// Utility functions for workflow execution
export const workflowExecutionUtils = {
  /**
   * Validate execution configuration
   */
  validateExecutionConfig(config) {
    const errors = [];

    if (config.title && config.title.length > 255) {
      errors.push("Title must be less than 255 characters");
    }

    if (config.due_date && new Date(config.due_date) < new Date()) {
      errors.push("Due date cannot be in the past");
    }

    if (
      config.scheduled_start &&
      new Date(config.scheduled_start) < new Date()
    ) {
      errors.push("Scheduled start time cannot be in the past");
    }

    if (config.assignee_email && !this.isValidEmail(config.assignee_email)) {
      errors.push("Invalid assignee email format");
    }

    if (
      config.priority &&
      !["low", "medium", "high", "urgent"].includes(config.priority)
    ) {
      errors.push("Priority must be one of: low, medium, high, urgent");
    }

    return errors;
  },

  /**
   * Email validation helper
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Generate execution configuration presets
   */
  getExecutionPresets() {
    return {
      standard: {
        title: "Standard Execution",
        priority: "medium",
        notify_stakeholders: true,
        auto_assign: true,
      },
      urgent: {
        title: "Urgent Execution",
        priority: "urgent",
        notify_stakeholders: true,
        auto_assign: true,
        timeout_minutes: 60,
      },
      background: {
        title: "Background Processing",
        priority: "low",
        notify_stakeholders: false,
        auto_assign: true,
      },
      scheduled: {
        title: "Scheduled Execution",
        priority: "medium",
        notify_stakeholders: true,
        auto_assign: false, // Manual assignment for scheduled workflows
      },
    };
  },

  /**
   * Format execution data for API
   */
  formatExecutionData(formData) {
    const formatted = { ...formData };

    // Parse JSON fields
    if (formatted.custom_data && typeof formatted.custom_data === "string") {
      try {
        formatted.custom_data = JSON.parse(formatted.custom_data);
      } catch (error) {
        throw new Error("Invalid JSON in custom data field");
      }
    }

    // Convert date strings to ISO format
    if (formatted.due_date && typeof formatted.due_date === "string") {
      formatted.due_date = new Date(formatted.due_date).toISOString();
    }

    if (
      formatted.scheduled_start &&
      typeof formatted.scheduled_start === "string"
    ) {
      formatted.scheduled_start = new Date(
        formatted.scheduled_start
      ).toISOString();
    }

    // Ensure numeric fields are properly typed
    if (formatted.timeout_minutes) {
      formatted.timeout_minutes = parseInt(formatted.timeout_minutes, 10);
    }

    return formatted;
  },

  /**
   * Get execution status display information
   */
  getExecutionStatusInfo(status) {
    const statusMap = {
      pending: { color: "yellow", icon: "clock", label: "Pending" },
      running: { color: "blue", icon: "play", label: "Running" },
      completed: { color: "green", icon: "check", label: "Completed" },
      failed: { color: "red", icon: "x", label: "Failed" },
      cancelled: { color: "gray", icon: "stop", label: "Cancelled" },
      scheduled: { color: "purple", icon: "calendar", label: "Scheduled" },
    };

    return (
      statusMap[status] || { color: "gray", icon: "question", label: "Unknown" }
    );
  },
};
