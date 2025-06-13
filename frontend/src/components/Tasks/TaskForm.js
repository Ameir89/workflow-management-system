import React, { useState } from "react";
import { useQuery, useMutation } from "react-query";
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

  // Submit form response mutation
  const submitFormMutation = useMutation(
    (formData) => taskService.submitFormResponse(taskId, formData),
    {
      onSuccess: () => {
        toast.success(t("tasks.formSubmitted"));
        navigate("/tasks");
      },
      onError: (error) => {
        toast.error(error.message);
        setSubmitting(false);
      },
    }
  );

  const handleFormSubmit = (formData) => {
    setSubmitting(true);
    submitFormMutation.mutate(formData);
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
        <h1 className="text-2xl font-bold text-gray-900">{task.name}</h1>
        <p className="text-gray-600 mt-2">{task.description}</p>

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

      {/* Form */}
      {form ? (
        <DynamicForm
          schema={form.schema}
          onSubmit={handleFormSubmit}
          onCancel={handleCancel}
          isSubmitting={submitting}
        />
      ) : (
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600 mb-6">{t("tasks.noFormRequired")}</p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={() => handleFormSubmit({})}
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
        </div>
      )}
    </div>
  );
};

export default TaskForm;
