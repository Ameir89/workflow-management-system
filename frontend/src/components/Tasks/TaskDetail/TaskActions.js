import React from "react";
import { useTranslation } from "react-i18next";
import {
  PlayIcon,
  CheckCircleIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import TaskApprovalActions from "./TaskApprovalActions";

const TaskActions = ({
  task,
  form,
  onStatusChange,
  onShowForm,
  onApprovalAction,
  submitting,
}) => {
  const { t } = useTranslation();

  if (task.status === "completed") {
    return null;
  }

  // Check if this is an approval task
  const isApprovalTask =
    task.type === "approval" || task.step_type === "approval";

  // If it's an approval task, show approval actions
  if (isApprovalTask) {
    return (
      <TaskApprovalActions
        task={task}
        form={form}
        onApprovalAction={onApprovalAction}
        submitting={submitting}
      />
    );
  }

  // Regular task actions for non-approval tasks
  return (
    <div className="flex flex-col space-y-2">
      {task.status === "pending" && (
        <button
          onClick={() => onStatusChange("in_progress")}
          disabled={submitting}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          <PlayIcon className="h-4 w-4 mr-2" />
          {t("tasks.startTask")}
        </button>
      )}

      {task.form_id ? (
        <button
          onClick={() => onShowForm(true)}
          disabled={submitting}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
        >
          <DocumentTextIcon className="h-4 w-4 mr-2" />
          {t("tasks.completeWithForm")}
        </button>
      ) : (
        <button
          onClick={() => onStatusChange("completed")}
          disabled={submitting}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
        >
          <CheckCircleIcon className="h-4 w-4 mr-2" />
          {t("tasks.markComplete")}
        </button>
      )}
    </div>
  );
};

export default TaskActions;
