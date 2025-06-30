// src/utils/taskDataUtils.js - Updated utility functions for extracting task data

/**
 * Extract submitted form data from a task object
 * Handles multiple possible data locations in the API response
 */
export const getSubmittedData = (task) => {
  // Priority order for finding submitted data:
  // 1. workflow_data.result (for completed tasks - highest priority)
  // 2. workflow_data.form_data (most specific)
  // 3. form_data (direct property)
  // 4. submitted_data (fallback)
  // 5. result (legacy)
  // 6. workflow_data.data (general workflow data)
  // 7. workflow_data (entire workflow data object, excluding metadata)

  // Check workflow_data.result first (for completed tasks)
  if (
    task?.workflow_data?.result &&
    typeof task.workflow_data.result === "object"
  ) {
    return task.workflow_data.result;
  }

  // Check other locations
  if (task?.workflow_data?.form_data) {
    return task.workflow_data.form_data;
  }

  if (task?.form_data) {
    return task.form_data;
  }

  if (task?.submitted_data) {
    return task.submitted_data;
  }

  if (task?.result) {
    return task.result;
  }

  if (task?.workflow_data?.data) {
    return task.workflow_data.data;
  }

  // Last resort: check if workflow_data has form-like data (exclude metadata fields)
  if (task?.workflow_data && typeof task.workflow_data === "object") {
    // Create a copy without common metadata fields
    const workflowDataCopy = { ...task.workflow_data };
    const metadataFields = [
      "approval_decision",
      "approval_status",
      "approved_by",
      "comments",
      "cost_center",
      "department",
      "project_id",
      "start_reason",
      "started_by",
      "form_data",
      "result",
      "data",
      "submitted_at",
      "submitted_by",
      "created_at",
      "updated_at",
      "status",
      "workflow_id",
      "task_id",
    ];

    metadataFields.forEach((field) => delete workflowDataCopy[field]);

    // If there's still data after removing metadata, return it
    if (Object.keys(workflowDataCopy).length > 0) {
      return workflowDataCopy;
    }
  }

  return null;
};

/**
 * Get all possible data sources from a task for debugging/inspection
 */
export const getAllDataSources = (task) => {
  return {
    workflow_data_result: task?.workflow_data?.result || null,
    workflow_data_form_data: task?.workflow_data?.form_data || null,
    form_data: task?.form_data || null,
    submitted_data: task?.submitted_data || null,
    result: task?.result || null,
    workflow_data_data: task?.workflow_data?.data || null,
    workflow_data_full: task?.workflow_data || null,
  };
};

/**
 * Check if a task has any submitted data
 */
export const hasSubmittedData = (task) => {
  const data = getSubmittedData(task);
  return (
    data != null &&
    (typeof data === "object" ? Object.keys(data).length > 0 : true)
  );
};

/**
 * Get submission metadata (who submitted, when)
 */
export const getSubmissionMetadata = (task) => {
  return {
    submittedAt:
      task?.submitted_at ||
      task?.workflow_data?.submitted_at ||
      task?.created_at,
    submittedBy:
      task?.submitted_by_name ||
      task?.workflow_data?.submitted_by ||
      task?.created_by_name,
    submittedById:
      task?.submitted_by ||
      task?.workflow_data?.submitted_by_id ||
      task?.created_by,
  };
};

/**
 * Check if a task is an approval task
 */
export const isApprovalTask = (task) => {
  return (
    task?.type === "approval" ||
    task?.step_type === "approval" ||
    task?.task_type === "approval"
  );
};

/**
 * Get approval-specific metadata
 */
export const getApprovalMetadata = (task) => {
  if (!isApprovalTask(task)) {
    return null;
  }

  return {
    approvalType: task?.approval_type || "Single Approver",
    approvers: task?.approvers || [],
    approvalDeadline: task?.approval_deadline || task?.due_date,
    approvalDecision:
      task?.approval_decision || task?.workflow_data?.approval_decision,
    approvalComment: task?.approval_comment || task?.workflow_data?.comments,
    approvalCompletedAt: task?.approval_completed_at || task?.completed_at,
    approvalStatus: task?.workflow_data?.approval_status,
    approvedBy: task?.workflow_data?.approved_by,
  };
};

/**
 * Format a value for display in the UI
 */
export const formatDisplayValue = (value) => {
  if (value === null || value === undefined) {
    return "Not provided";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "None";
  }

  if (typeof value === "object") {
    // Handle objects with label/value structure (from select fields)
    if (value.label && value.value) {
      return value.label || value.value;
    }

    // For dates
    if (value instanceof Date) {
      return value.toLocaleString();
    }

    // For other objects, return JSON string
    return JSON.stringify(value, null, 2);
  }

  return String(value);
};

/**
 * Get the appropriate default values for a form based on task data
 */
export const getFormDefaultValues = (task) => {
  const submittedData = getSubmittedData(task);

  // Return submitted data if available, otherwise empty object
  return submittedData && typeof submittedData === "object"
    ? submittedData
    : {};
};

/**
 * Check if task data should be displayed prominently (for approvals)
 */
export const shouldShowDataProminently = (task) => {
  return isApprovalTask(task) && hasSubmittedData(task);
};

/**
 * Get a user-friendly task type label
 */
export const getTaskTypeLabel = (task) => {
  const type = task?.type || task?.step_type || task?.task_type || "task";

  const typeLabels = {
    approval: "Approval",
    task: "Task",
    notification: "Notification",
    automation: "Automation",
    condition: "Condition",
    review: "Review",
    form: "Form",
  };

  return (
    typeLabels[type.toLowerCase()] ||
    type.charAt(0).toUpperCase() + type.slice(1)
  );
};

/**
 * Extract workflow context information
 */
export const getWorkflowContext = (task) => {
  return {
    workflowId: task?.workflow_id,
    workflowTitle: task?.workflow_title || task?.workflow_name,
    workflowInstanceId: task?.workflow_instance_id,
    stepId: task?.step_id,
    stepName: task?.step_name || task?.name,
  };
};

/**
 * Prepare data for approval submission
 */
export const prepareApprovalData = (
  action,
  comment,
  task,
  additionalData = {}
) => {
  const submittedData = getSubmittedData(task);
  const metadata = getSubmissionMetadata(task);

  return {
    decision: action,
    comment: comment || "",
    reviewed_data: submittedData,
    original_submission: {
      submitted_at: metadata.submittedAt,
      submitted_by: metadata.submittedBy,
      data: submittedData,
    },
    approval_timestamp: new Date().toISOString(),
    ...additionalData,
  };
};

/**
 * Check if the task data contains meaningful form data (not just metadata)
 */
export const hasFormData = (task) => {
  const data = getSubmittedData(task);

  if (!data || typeof data !== "object") {
    return false;
  }

  // If it's an array, check if it has content
  if (Array.isArray(data)) {
    return data.length > 0;
  }

  // Check if there are any non-metadata fields
  const keys = Object.keys(data);
  const metadataFields = [
    "approval_decision",
    "approval_status",
    "approved_by",
    "comments",
    "start_reason",
    "started_by",
    "created_at",
    "updated_at",
  ];

  const formFields = keys.filter((key) => !metadataFields.includes(key));
  return formFields.length > 0;
};

/**
 * Get data source information for debugging
 */
export const getDataSource = (task) => {
  if (task?.workflow_data?.result) return "workflow_data.result";
  if (task?.workflow_data?.form_data) return "workflow_data.form_data";
  if (task?.form_data) return "form_data";
  if (task?.submitted_data) return "submitted_data";
  if (task?.result) return "result";
  if (task?.workflow_data?.data) return "workflow_data.data";
  if (task?.workflow_data) return "workflow_data";
  return "none";
};

const taskDataUtils = {
  getSubmittedData,
  getAllDataSources,
  hasSubmittedData,
  getSubmissionMetadata,
  isApprovalTask,
  getApprovalMetadata,
  formatDisplayValue,
  getFormDefaultValues,
  shouldShowDataProminently,
  getTaskTypeLabel,
  getWorkflowContext,
  prepareApprovalData,
  hasFormData,
  getDataSource,
};

export default taskDataUtils;
