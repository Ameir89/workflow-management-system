import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { taskService } from "../../services/taskService";
import { formsService } from "../../services/formsService";
import DynamicForm from "../Forms/DynamicForm";
import LoadingSpinner from "../Common/LoadingSpinner";

const TaskForm = () => {
  const { t } = useTranslation();
  const { taskId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  // Fetch task details
  const { data: task, isLoading: taskLoading } = useQuery(
    ["task", taskId],
    () => taskService.getTask(taskId),
    {
      onError: (error) => {
        toast.error(error.message);
        navigate("/tasks");
      },
    }
  );

  // Fetch form details if task has a form
  const { data: form, isLoading: formLoading } = useQuery(
    ["task-form", task?.form_id],
    () => formsService.getForm(task.form_id),
    {
      enabled: !!task?.form_id,
      onError: (error) => {
        toast.error(t("tasks.formLoadError"));
      },
    }
  );

  // Submit form response and update task status
  const submitFormMutation = useMutation(
    async (formData) => {
      // First submit the form response if there's a form
      if (task.form_id && form) {
        await taskService.submitFormResponse(taskId, formData);
      }

      // Then complete the task with status update
      return await taskService.completeTask(taskId, {
        status: "completed",
        result: formData,
        completed_at: new Date().toISOString(),
        form_data: formData,
      });
    },
    {
      onSuccess: (data) => {
        toast.success(t("tasks.taskCompleted"));

        // Invalidate related queries to refresh data
        queryClient.invalidateQueries(["tasks"]);
        queryClient.invalidateQueries(["task", taskId]);
        queryClient.invalidateQueries(["task-dashboard-stats"]);
        queryClient.invalidateQueries(["sidebar-task-stats"]);

        navigate("/tasks");
      },
      onError: (error) => {
        toast.error(error.message || t("tasks.completionFailed"));
        setSubmitting(false);
      },
    }
  );

  // Update task status mutation (for non-form tasks)
  const updateTaskStatusMutation = useMutation(
    (statusData) => taskService.updateTaskStatus(taskId, statusData),
    {
      onSuccess: (data) => {
        toast.success(t("tasks.statusUpdated"));

        // Invalidate related queries
        queryClient.invalidateQueries(["tasks"]);
        queryClient.invalidateQueries(["task", taskId]);
        queryClient.invalidateQueries(["task-dashboard-stats"]);
        queryClient.invalidateQueries(["sidebar-task-stats"]);

        navigate("/tasks");
      },
      onError: (error) => {
        toast.error(error.message || t("tasks.statusUpdateFailed"));
        setSubmitting(false);
      },
    }
  );

  const handleFormSubmit = (formData) => {
    setSubmitting(true);
    submitFormMutation.mutate(formData);
  };

  const handleTaskCompletion = (status = "completed") => {
    setSubmitting(true);

    if (task.form_id) {
      // If task has a form but no data provided, complete with empty form
      submitFormMutation.mutate({});
    } else {
      // Direct task completion without form
      updateTaskStatusMutation.mutate({
        status: status,
        completed_at: status === "completed" ? new Date().toISOString() : null,
        result: { action: status },
      });
    }
  };

  const handleTaskStatusChange = (newStatus) => {
    setSubmitting(true);
    updateTaskStatusMutation.mutate({
      status: newStatus,
      updated_at: new Date().toISOString(),
    });
  };

  const handleCancel = () => {
    navigate("/tasks");
  };

  if (taskLoading || formLoading) {
    return <LoadingSpinner fullScreen text={t("common.loading")} />;
  }

  if (!task) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">
          {t("tasks.notFound")}
        </h3>
        <button
          onClick={() => navigate("/tasks")}
          className="mt-4 text-indigo-600 hover:text-indigo-800"
        >
          {t("tasks.backToList")}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Task Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{task.name}</h1>
            <p className="text-gray-600 mt-2">{task.description}</p>
          </div>

          {/* Current Status Badge */}
          <div className="flex items-center space-x-3">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                task.status === "completed"
                  ? "bg-green-100 text-green-800"
                  : task.status === "in_progress"
                  ? "bg-blue-100 text-blue-800"
                  : task.status === "overdue"
                  ? "bg-red-100 text-red-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {t(`tasks.${task.status}`)}
            </span>
          </div>
        </div>

        {task.instructions && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 mb-1">
              {t("tasks.instructions")}
            </h3>
            <p className="text-sm text-blue-800">{task.instructions}</p>
          </div>
        )}

        <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
          <span>
            {t("tasks.workflow")}: {task.workflow_title}
          </span>
          {task.assigned_to_name && (
            <>
              <span>•</span>
              <span>
                {t("tasks.assignedTo")}: {task.assigned_to_name}
              </span>
            </>
          )}
          {task.due_date && (
            <>
              <span>•</span>
              <span>
                {t("tasks.dueDate")}:{" "}
                {new Date(task.due_date).toLocaleDateString()}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Status Change Actions (for non-completed tasks) */}
      {task.status !== "completed" && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            {t("tasks.quickActions")}
          </h3>
          <div className="flex flex-wrap gap-2">
            {task.status === "pending" && (
              <button
                onClick={() => handleTaskStatusChange("in_progress")}
                disabled={submitting}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {t("tasks.startTask")}
              </button>
            )}

            {(task.status === "pending" || task.status === "in_progress") && (
              <button
                onClick={() => handleTaskCompletion("completed")}
                disabled={submitting}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
              >
                {task.form_id
                  ? t("tasks.completeWithForm")
                  : t("tasks.markComplete")}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Form Section */}
      {form ? (
        <DynamicForm
          schema={form.schema}
          onSubmit={handleFormSubmit}
          onCancel={handleCancel}
          isSubmitting={submitting}
          readOnly={task.status === "completed"}
        />
      ) : (
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 mb-6">
            {task.status === "completed"
              ? t("tasks.taskAlreadyCompleted")
              : t("tasks.noFormRequired")}
          </p>

          {task.status !== "completed" && (
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => handleTaskCompletion("completed")}
                disabled={submitting}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t("common.submitting")}
                  </div>
                ) : (
                  t("tasks.completeTask")
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Task completed message */}
      {task.status === "completed" && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <svg
              className="h-5 w-5 text-green-400 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-green-800 font-medium">
              {t("tasks.taskCompletedMessage")}
            </p>
          </div>
          {task.completed_at && (
            <p className="text-green-700 text-sm mt-1">
              {t("tasks.completedAt")}:{" "}
              {new Date(task.completed_at).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskForm;
