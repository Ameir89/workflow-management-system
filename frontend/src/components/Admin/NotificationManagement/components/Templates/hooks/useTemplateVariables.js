// src/components/Notifications/Templates/hooks/useTemplateVariables.js
import { useState, useCallback } from "react";

const DEFAULT_VARIABLES = {
  task: [
    { key: "user_name", description: "User's full name", example: "John Doe" },
    { key: "task_name", description: "Task title", example: "Review Document" },
    { key: "due_date", description: "Task due date", example: "2025-06-30" },
    { key: "assignee", description: "Assigned user", example: "Jane Smith" },
  ],
  workflow: [
    {
      key: "workflow_name",
      description: "Workflow name",
      example: "Approval Process",
    },
    {
      key: "initiator",
      description: "Workflow initiator",
      example: "Admin User",
    },
    {
      key: "current_step",
      description: "Current workflow step",
      example: "Manager Approval",
    },
  ],
  system: [
    {
      key: "system_name",
      description: "System name",
      example: "Workflow System",
    },
    {
      key: "error_message",
      description: "Error details",
      example: "Connection timeout",
    },
    {
      key: "timestamp",
      description: "Event timestamp",
      example: "2025-06-17 14:30:00",
    },
  ],
  reminder: [
    {
      key: "reminder_title",
      description: "Reminder title",
      example: "Meeting Reminder",
    },
    {
      key: "reminder_time",
      description: "Reminder time",
      example: "2025-06-17 15:00",
    },
    {
      key: "location",
      description: "Meeting location",
      example: "Conference Room A",
    },
  ],
  alert: [
    {
      key: "alert_type",
      description: "Type of alert",
      example: "Security Alert",
    },
    { key: "severity", description: "Alert severity", example: "High" },
    {
      key: "action_required",
      description: "Required action",
      example: "Immediate attention needed",
    },
  ],
};

export const useTemplateVariables = (initialCategory = "task") => {
  const [variables, setVariables] = useState(
    DEFAULT_VARIABLES[initialCategory] || []
  );

  const addVariable = useCallback(() => {
    setVariables((prev) => [
      ...prev,
      { key: "", description: "", example: "" },
    ]);
  }, []);

  const updateVariable = useCallback((index, field, value) => {
    setVariables((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const removeVariable = useCallback((index) => {
    setVariables((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const resetToDefaults = useCallback((category) => {
    setVariables(DEFAULT_VARIABLES[category] || []);
  }, []);

  const getVariablesForCategory = useCallback((category) => {
    return DEFAULT_VARIABLES[category] || [];
  }, []);

  return {
    variables,
    setVariables,
    addVariable,
    updateVariable,
    removeVariable,
    resetToDefaults,
    getVariablesForCategory,
  };
};
