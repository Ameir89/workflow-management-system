import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowUturnLeftIcon,
  ChatBubbleLeftIcon,
} from "@heroicons/react/24/outline";
import DynamicForm from "../../Forms/DynamicForm";
import SubmittedDataViewer from "./SubmittedDataViewer";

const TaskApprovalActions = ({ task, form, onApprovalAction, submitting }) => {
  const { t } = useTranslation();
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [comment, setComment] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showSubmittedData, setShowSubmittedData] = useState(false);

  if (task.status === "completed") {
    return null;
  }

  // Check if this is an approval task
  const isApprovalTask =
    task.type === "approval" || task.step_type === "approval";

  if (!isApprovalTask) {
    return null;
  }

  const handleActionClick = (action) => {
    setSelectedAction(action);
    setShowCommentModal(true);
  };

  const handleFormSubmit = (formData) => {
    // Submit approval with form data
    onApprovalAction("approve", {
      comment: comment,
      form_data: formData,
    });
    setShowForm(false);
    setShowCommentModal(false);
    setComment("");
    setSelectedAction(null);
  };

  const handleApprovalSubmit = () => {
    onApprovalAction(selectedAction, {
      comment: comment,
      reviewed_data:
        task.workflow_data?.form_data || task.form_data || task.submitted_data,
    });
    setShowCommentModal(false);
    setComment("");
    setSelectedAction(null);
  };

  const getActionConfig = (action) => {
    const configs = {
      approve: {
        label: t("tasks.approve"),
        icon: CheckCircleIcon,
        className: "bg-green-600 hover:bg-green-700 text-white",
        description: "Approve this request",
      },
      reject: {
        label: t("tasks.reject"),
        icon: XCircleIcon,
        className: "bg-red-600 hover:bg-red-700 text-white",
        description: "Reject this request",
      },
      return: {
        label: t("tasks.returnForChanges"),
        icon: ArrowUturnLeftIcon,
        className: "bg-yellow-600 hover:bg-yellow-700 text-white",
        description: "Return for changes",
      },
    };
    return configs[action];
  };

  return (
    <>
      <div className="flex flex-col space-y-3">
        {/* Submitted Data Review Section */}
        {(task.workflow_data?.form_data ||
          task.form_data ||
          task.submitted_data ||
          task.result ||
          task.workflow_data) && (
          <SubmittedDataViewer task={task} form={form} />
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">
            {t("tasks.approvalRequired")}
          </h3>
          <p className="text-blue-800 text-sm">
            {task.workflow_data?.form_data ||
            task.form_data ||
            task.submitted_data ||
            task.result
              ? t("tasks.approvalDescriptionWithData")
              : t("tasks.approvalDescription")}
          </p>
        </div>

        <div className="flex flex-col space-y-2">
          {/* Approve Button */}
          <button
            onClick={() => handleActionClick("approve")}
            disabled={submitting}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 transition-colors"
          >
            <CheckCircleIcon className="h-4 w-4 mr-2" />
            {t("tasks.approve")}
          </button>

          {/* Return for Changes Button */}
          <button
            onClick={() => handleActionClick("return")}
            disabled={submitting}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium bg-yellow-600 hover:bg-yellow-700 text-white disabled:opacity-50 transition-colors"
          >
            <ArrowUturnLeftIcon className="h-4 w-4 mr-2" />
            {t("tasks.returnForChanges")}
          </button>

          {/* Reject Button */}
          <button
            onClick={() => handleActionClick("reject")}
            disabled={submitting}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 transition-colors"
          >
            <XCircleIcon className="h-4 w-4 mr-2" />
            {t("tasks.reject")}
          </button>
        </div>

        {/* Approval Information */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="text-xs text-gray-600 space-y-1">
            <div>
              <span className="font-medium">{t("tasks.approvalType")}:</span>{" "}
              {task.approval_type || "Single Approver"}
            </div>
            {task.approvers && task.approvers.length > 0 && (
              <div>
                <span className="font-medium">{t("tasks.approvers")}:</span>{" "}
                {task.approvers.join(", ")}
              </div>
            )}
            {task.due_date && (
              <div>
                <span className="font-medium">{t("tasks.dueDate")}:</span>{" "}
                {new Date(task.due_date).toLocaleDateString()}
              </div>
            )}
            {(task.submitted_at ||
              task.workflow_data?.submitted_at ||
              task.created_at) && (
              <div>
                <span className="font-medium">{t("tasks.submittedAt")}:</span>{" "}
                {new Date(
                  task.submitted_at ||
                    task.workflow_data?.submitted_at ||
                    task.created_at
                ).toLocaleString()}
              </div>
            )}
            {(task.submitted_by ||
              task.workflow_data?.submitted_by ||
              task.created_by_name) && (
              <div>
                <span className="font-medium">{t("tasks.submittedBy")}:</span>{" "}
                {task.submitted_by_name ||
                  task.workflow_data?.submitted_by ||
                  task.created_by_name ||
                  "Unknown"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comment Modal */}
      {showCommentModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {getActionConfig(selectedAction)?.label}
              </h3>
              <button
                onClick={() => {
                  setShowCommentModal(false);
                  setSelectedAction(null);
                  setComment("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                {getActionConfig(selectedAction)?.description}
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("tasks.comment")}{" "}
                  {selectedAction !== "approve" && (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <textarea
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t("tasks.commentPlaceholder")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required={selectedAction !== "approve"}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowCommentModal(false);
                    setSelectedAction(null);
                    setComment("");
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleApprovalSubmit}
                  disabled={
                    submitting ||
                    (selectedAction !== "approve" && !comment.trim())
                  }
                  className={`px-4 py-2 border border-transparent rounded-md text-sm font-medium disabled:opacity-50 ${
                    getActionConfig(selectedAction)?.className
                  }`}
                >
                  {submitting ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {t("common.submitting")}
                    </div>
                  ) : (
                    getActionConfig(selectedAction)?.label
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal for Approval with Form */}
      {showForm && form && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {t("tasks.approveWithForm")} - {form.name}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setSelectedAction(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("tasks.approvalComment")}
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t("tasks.approvalCommentPlaceholder")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <DynamicForm
              schema={form.schema}
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setShowForm(false);
                setSelectedAction(null);
              }}
              isSubmitting={submitting}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default TaskApprovalActions;
