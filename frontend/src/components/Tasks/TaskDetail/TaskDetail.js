import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { taskService } from "../../../services/taskService";
import { formsService } from "../../../services/formsService";
import LoadingSpinner from "../../Common/LoadingSpinner";
import ErrorDisplay from "../../Common/ErrorDisplay";
import TaskDetailHeader from "./TaskDetailHeader";
import TaskTabs from "./TaskTabs";
import TaskTabContent from "./TaskTabContent";
import TaskFormModal from "./TaskFormModal";
import "./TaskDetail.css";

const TaskDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("details");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch task details
  const {
    data: task,
    isLoading: taskLoading,
    error: taskError,
  } = useQuery(["task", id], () => taskService.getTask(id), {
    onError: (error) => {
      toast.error(error.message);
    },
  });

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

  // Task status update mutation
  const updateTaskStatusMutation = useMutation(
    ({ status, data }) => taskService.updateTaskStatus(id, { status, ...data }),
    {
      onSuccess: () => {
        toast.success(t("tasks.statusUpdated"));
        queryClient.invalidateQueries(["task", id]);
        queryClient.invalidateQueries(["tasks"]);
        setSubmitting(false);
      },
      onError: (error) => {
        toast.error(error.message || t("tasks.statusUpdateFailed"));
        setSubmitting(false);
      },
    }
  );

  // Complete task with form submission
  const completeTaskMutation = useMutation(
    (formData) => taskService.completeTask(id, { result: formData }),
    {
      onSuccess: () => {
        toast.success(t("tasks.taskCompleted"));
        queryClient.invalidateQueries(["task", id]);
        queryClient.invalidateQueries(["tasks"]);
        setShowForm(false);
        setSubmitting(false);
      },
      onError: (error) => {
        toast.error(error.message || t("tasks.completionFailed"));
        setSubmitting(false);
      },
    }
  );

  // Approval action mutation
  const approvalActionMutation = useMutation(
    ({ action, data }) =>
      taskService.submitApprovalDecision(id, { decision: action, ...data }),
    {
      onSuccess: (response, variables) => {
        const actionMessages = {
          approve: t("tasks.approvalSubmitted"),
          reject: t("tasks.rejectionSubmitted"),
          return: t("tasks.returnedForChanges"),
        };
        toast.success(
          actionMessages[variables.action] || t("tasks.approvalSubmitted")
        );
        queryClient.invalidateQueries(["task", id]);
        queryClient.invalidateQueries(["tasks"]);
        setSubmitting(false);
      },
      onError: (error) => {
        toast.error(error.message || t("tasks.approvalFailed"));
        setSubmitting(false);
      },
    }
  );

  const handleStatusChange = (newStatus) => {
    setSubmitting(true);
    updateTaskStatusMutation.mutate({
      status: newStatus,
      data: {
        updated_at: new Date().toISOString(),
        ...(newStatus === "completed" && {
          completed_at: new Date().toISOString(),
        }),
      },
    });
  };

  const handleFormSubmit = (formData) => {
    setSubmitting(true);
    completeTaskMutation.mutate(formData);
  };

  const handleApprovalAction = (action, data = {}) => {
    setSubmitting(true);

    const approvalData = {
      action,
      comment: data.comment || "",
      form_data: data.form_data || null,
      timestamp: new Date().toISOString(),
    };

    // If using the taskService.submitApprovalDecision method
    if (typeof taskService.submitApprovalDecision === "function") {
      approvalActionMutation.mutate({ action, data: approvalData });
    } else {
      // Fallback to updateTaskStatus with approval data
      updateTaskStatusMutation.mutate({
        status: action === "approve" ? "completed" : "pending",
        data: {
          approval_decision: action,
          approval_comment: data.comment,
          approval_form_data: data.form_data,
          completed_at: action === "approve" ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        },
      });
    }
  };

  if (taskLoading || formLoading) {
    return <LoadingSpinner fullScreen text={t("common.loading")} />;
  }

  if (taskError || !task) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <ErrorDisplay
          title={t("tasks.notFound")}
          message="The requested task could not be found or you don't have permission to access it."
          onBack={() => navigate("/tasks")}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
      <TaskDetailHeader
        task={task}
        form={form}
        onStatusChange={handleStatusChange}
        onShowForm={setShowForm}
        onApprovalAction={handleApprovalAction}
        submitting={submitting}
      />

      <TaskFormModal
        show={showForm}
        onClose={() => setShowForm(false)}
        form={form}
        task={task}
        onSubmit={handleFormSubmit}
        submitting={submitting}
      />

      <TaskTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hasForm={!!task.form_id}
      />

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <TaskTabContent
          activeTab={activeTab}
          task={task}
          form={form}
          onFormSubmit={handleFormSubmit}
          submitting={submitting}
        />
      </div>
    </div>
  );
};

export default TaskDetail;
