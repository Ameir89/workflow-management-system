// src/utils/taskDataUtils.js - Utility functions for extracting task data

/**
 * Extract submitted form data from a task object
 * Handles multiple possible data locations in the API response
 */
export const getSubmittedData = (task) => {
  // Priority order for finding submitted data:
  // 1. workflow_data.form_data (most specific)
  // 2. form_data (direct property)
  // 3. submitted_data (fallback)
  // 4. result (legacy)
  // 5. workflow_data.data (general workflow data)
  // 6. workflow_data (entire workflow data object)

  return (
    task?.workflow_data?.form_data ||
    task?.form_data ||
    task?.submitted_data ||
    task?.result ||
    task?.workflow_data?.data ||
    (task?.workflow_data &&
    typeof task.workflow_data === "object" &&
    Object.keys(task.workflow_data).length > 0
      ? task.workflow_data
      : null)
  );
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
    approvalDecision: task?.approval_decision,
    approvalComment: task?.approval_comment,
    approvalCompletedAt: task?.approval_completed_at || task?.completed_at,
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

const taskDataUtils = {
  getSubmittedData,
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
};

export default taskDataUtils;
