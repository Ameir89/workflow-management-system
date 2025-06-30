// import React, { useState } from "react";
// import { useTranslation } from "react-i18next";
// import {
//   CheckCircleIcon,
//   XCircleIcon,
//   ArrowUturnLeftIcon,
//   ChatBubbleLeftIcon,
// } from "@heroicons/react/24/outline";
// import DynamicForm from "../../Forms/DynamicForm";
// import SubmittedDataViewer from "./SubmittedDataViewer";

// const TaskApprovalActions = ({
//   task,
//   form,
//   onApprovalAction,
//   submitting,
// }) => {
//   const { t } = useTranslation();
//   const [showCommentModal, setShowCommentModal] = useState(false);
//   const [selectedAction, setSelectedAction] = useState(null);
//   const [comment, setComment] = useState("");
//   const [showForm, setShowForm] = useState(false);
//   const [showSubmittedData, setShowSubmittedData] = useState(false);

//   if (task.status === "completed") {
//     return null;
//   }

//   // Check if this is an approval task
//   const isApprovalTask = task.type === "approval" || task.step_type === "approval";

//   if (!isApprovalTask) {
//     return null;
//   }

//   const handleActionClick = (action) => {
//     setSelectedAction(action);
//     setShowCommentModal(true);
//   };

//   const handleFormSubmit = (formData) => {
//     // Submit approval with form data
//     onApprovalAction("approve", {
//       comment: comment,
//       form_data: formData,
//     });
//     setShowForm(false);
//     setShowCommentModal(false);
//     setComment("");
//     setSelectedAction(null);
//   };

//   const handleApprovalSubmit = () => {
//     onApprovalAction(selectedAction, {
//       comment: comment,
//       reviewed_data: task.workflow_data?.form_data || task.form_data || task.submitted_data,
//     });
//     setShowCommentModal(false);
//     setComment("");
//     setSelectedAction(null);
//   };

//   const getActionConfig = (action) => {
//     const configs = {
//       approve: {
//         label: t("tasks.approve"),
//         icon: CheckCircleIcon,
//         className: "bg-green-600 hover:bg-green-700 text-white",
//         description: "Approve this request",
//       },
//       reject: {
//         label: t("tasks.reject"),
//         icon: XCircleIcon,
//         className: "bg-red-600 hover:bg-red-700 text-white",
//         description: "Reject this request",
//       },
//       return: {
//         label: t("tasks.returnForChanges"),
//         icon: ArrowUturnLeftIcon,
//         className: "bg-yellow-600 hover:bg-yellow-700 text-white",
//         description: "Return for changes",
//       },
//     };
//     return configs[action];
//   };

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowUturnLeftIcon,
  UserPlusIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import {
  CheckCircleIcon as CheckCircleIconSolid,
  XCircleIcon as XCircleIconSolid,
  ClockIcon as ClockIconSolid,
} from "@heroicons/react/24/solid";

const TaskApprovalActions = ({
  task,
  form,
  onApprovalAction,
  onAssignTask,
  submitting,
}) => {
  const { t } = useTranslation();
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [comment, setComment] = useState("");
  const [assigneeEmail, setAssigneeEmail] = useState("");

  if (task.status === "completed") {
    return null;
  }

  // Check if this is an approval task
  const isApprovalTask =
    task.type === "approval" || task.step_type === "approval";

  if (!isApprovalTask) {
    return null;
  }

  // Check if user can approve (basic check - you might want to implement more complex logic)
  const canApprove = true; // This should be determined by your business logic

  const handleActionClick = (action) => {
    setSelectedAction(action);
    setShowCommentModal(true);
  };

  const handleAssignClick = () => {
    setShowAssignModal(true);
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

  const handleAssignSubmit = () => {
    if (assigneeEmail.trim()) {
      onAssignTask(assigneeEmail.trim());
      setShowAssignModal(false);
      setAssigneeEmail("");
    }
  };

  const getActionConfig = (action) => {
    const configs = {
      approve: {
        label: t("tasks.approve"),
        icon: CheckCircleIcon,
        className:
          "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl",
        description: "Approve this request and continue the workflow",
      },
      reject: {
        label: t("tasks.reject"),
        icon: XCircleIcon,
        className:
          "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl",
        description: "Reject this request and stop the workflow",
      },
      return: {
        label: t("tasks.returnForChanges"),
        icon: ArrowUturnLeftIcon,
        className:
          "bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-lg hover:shadow-xl",
        description: "Return for changes and request revisions",
      },
    };
    return configs[action];
  };

  const getUrgencyLevel = () => {
    if (task.priority === "urgent") return "urgent";
    if (task.due_date && new Date(task.due_date) < new Date()) return "overdue";
    if (
      task.due_date &&
      new Date(task.due_date) < new Date(Date.now() + 24 * 60 * 60 * 1000)
    )
      return "due-soon";
    return "normal";
  };

  const urgencyLevel = getUrgencyLevel();

  return (
    <>
      <div className="space-y-4">
        {/* Approval Status Header */}
        <div
          className={`rounded-xl border-2 p-4 ${
            urgencyLevel === "urgent"
              ? "border-red-200 bg-red-50"
              : urgencyLevel === "overdue"
              ? "border-red-300 bg-red-100"
              : urgencyLevel === "due-soon"
              ? "border-amber-200 bg-amber-50"
              : "border-blue-200 bg-blue-50"
          }`}
        >
          <div className="flex items-start space-x-3">
            <div
              className={`p-2 rounded-lg ${
                urgencyLevel === "urgent"
                  ? "bg-red-100"
                  : urgencyLevel === "overdue"
                  ? "bg-red-200"
                  : urgencyLevel === "due-soon"
                  ? "bg-amber-100"
                  : "bg-blue-100"
              }`}
            >
              {urgencyLevel === "urgent" || urgencyLevel === "overdue" ? (
                <ExclamationTriangleIcon
                  className={`h-6 w-6 ${
                    urgencyLevel === "urgent" ? "text-red-600" : "text-red-700"
                  }`}
                />
              ) : (
                <ClockIconSolid
                  className={`h-6 w-6 ${
                    urgencyLevel === "due-soon"
                      ? "text-amber-600"
                      : "text-blue-600"
                  }`}
                />
              )}
            </div>
            <div className="flex-1">
              <h3
                className={`text-lg font-semibold ${
                  urgencyLevel === "urgent"
                    ? "text-red-900"
                    : urgencyLevel === "overdue"
                    ? "text-red-900"
                    : urgencyLevel === "due-soon"
                    ? "text-amber-900"
                    : "text-blue-900"
                }`}
              >
                {urgencyLevel === "urgent"
                  ? t("tasks.urgentApproval")
                  : urgencyLevel === "overdue"
                  ? t("tasks.overdue")
                  : urgencyLevel === "due-soon"
                  ? t("tasks.dueSoon")
                  : t("tasks.approvalRequired")}
              </h3>
              <p
                className={`text-sm mt-1 ${
                  urgencyLevel === "urgent"
                    ? "text-red-800"
                    : urgencyLevel === "overdue"
                    ? "text-red-800"
                    : urgencyLevel === "due-soon"
                    ? "text-amber-800"
                    : "text-blue-800"
                }`}
              >
                {t("tasks.approvalDescriptionWithData")}
              </p>
              {task.due_date && (
                <div className="flex items-center mt-2 text-xs">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  <span>
                    {t("tasks.dueDate")}:{" "}
                    {new Date(task.due_date).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons Grid */}
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700 mb-2">
            {t("tasks.selectAction")}:
          </div>

          {/* Primary Actions */}
          <div className="grid grid-cols-1 gap-3">
            {/* Approve Button */}
            <button
              onClick={() => handleActionClick("approve")}
              disabled={submitting || !canApprove}
              className={`group relative inline-flex items-center justify-center px-6 py-4 border-0 rounded-xl text-base font-medium transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none ${
                getActionConfig("approve").className
              }`}
            >
              <CheckCircleIconSolid className="h-6 w-6 mr-3" />
              <div className="text-left">
                <div className="font-semibold">{t("tasks.approve")}</div>
                <div className="text-sm opacity-90">
                  {getActionConfig("approve").description}
                </div>
              </div>
              <div className="absolute inset-0 rounded-xl bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
            </button>

            {/* Return for Changes Button */}
            <button
              onClick={() => handleActionClick("return")}
              disabled={submitting}
              className={`group relative inline-flex items-center justify-center px-6 py-4 border-0 rounded-xl text-base font-medium transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none ${
                getActionConfig("return").className
              }`}
            >
              <ArrowUturnLeftIcon className="h-6 w-6 mr-3" />
              <div className="text-left">
                <div className="font-semibold">
                  {t("tasks.returnForChanges")}
                </div>
                <div className="text-sm opacity-90">
                  {getActionConfig("return").description}
                </div>
              </div>
              <div className="absolute inset-0 rounded-xl bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
            </button>

            {/* Reject Button */}
            <button
              onClick={() => handleActionClick("reject")}
              disabled={submitting}
              className={`group relative inline-flex items-center justify-center px-6 py-4 border-0 rounded-xl text-base font-medium transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none ${
                getActionConfig("reject").className
              }`}
            >
              <XCircleIconSolid className="h-6 w-6 mr-3" />
              <div className="text-left">
                <div className="font-semibold">{t("tasks.reject")}</div>
                <div className="text-sm opacity-90">
                  {getActionConfig("reject").description}
                </div>
              </div>
              <div className="absolute inset-0 rounded-xl bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
            </button>
          </div>

          {/* Secondary Actions */}
          <div className="pt-3 border-t border-gray-200">
            <div className="text-sm font-medium text-gray-700 mb-2">
              {t("tasks.otherActions")}:
            </div>
            <button
              onClick={handleAssignClick}
              disabled={submitting}
              className="w-full inline-flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-150 disabled:opacity-50"
            >
              <UserPlusIcon className="h-5 w-5 mr-2" />
              {t("tasks.reassignTask")}
            </button>
          </div>
        </div>

        {/* Approval Information Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            {t("tasks.approvalDetails")}
          </h4>
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">{t("tasks.approvalType")}:</span>
              <span className="font-medium text-gray-900">
                {task.approval_type || "Single Approver"}
              </span>
            </div>

            {task.approvers && task.approvers.length > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">{t("tasks.approvers")}:</span>
                <span className="font-medium text-gray-900 text-right">
                  {task.approvers.join(", ")}
                </span>
              </div>
            )}

            {task.priority && (
              <div className="flex justify-between">
                <span className="text-gray-600">{t("tasks.priority")}:</span>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    task.priority === "urgent"
                      ? "bg-red-100 text-red-800"
                      : task.priority === "high"
                      ? "bg-orange-100 text-orange-800"
                      : task.priority === "medium"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {task.priority.toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comment Modal */}
      {showCommentModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                {selectedAction === "approve" && (
                  <CheckCircleIconSolid className="h-6 w-6 text-green-600 mr-2" />
                )}
                {selectedAction === "reject" && (
                  <XCircleIconSolid className="h-6 w-6 text-red-600 mr-2" />
                )}
                {selectedAction === "return" && (
                  <ArrowUturnLeftIcon className="h-6 w-6 text-amber-600 mr-2" />
                )}
                {getActionConfig(selectedAction)?.label}
              </h3>
              <button
                onClick={() => {
                  setShowCommentModal(false);
                  setSelectedAction(null);
                  setComment("");
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
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

            <div className="p-6 space-y-4">
              <div
                className={`p-4 rounded-lg ${
                  selectedAction === "approve"
                    ? "bg-green-50 border border-green-200"
                    : selectedAction === "reject"
                    ? "bg-red-50 border border-red-200"
                    : "bg-amber-50 border border-amber-200"
                }`}
              >
                <p
                  className={`text-sm ${
                    selectedAction === "approve"
                      ? "text-green-800"
                      : selectedAction === "reject"
                      ? "text-red-800"
                      : "text-amber-800"
                  }`}
                >
                  {getActionConfig(selectedAction)?.description}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("tasks.comment")}
                  {selectedAction !== "approve" && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </label>
                <textarea
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={
                    selectedAction === "approve"
                      ? t("tasks.approvalCommentPlaceholder")
                      : t("tasks.commentPlaceholder")
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                  required={selectedAction !== "approve"}
                />
                {selectedAction !== "approve" && (
                  <p className="text-xs text-gray-500 mt-1">
                    {t("tasks.commentRequired")}
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowCommentModal(false);
                    setSelectedAction(null);
                    setComment("");
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleApprovalSubmit}
                  disabled={
                    submitting ||
                    (selectedAction !== "approve" && !comment.trim())
                  }
                  className={`px-6 py-2 border-0 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 ${
                    getActionConfig(selectedAction)?.className
                  }`}
                >
                  {submitting ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
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

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <UserPlusIcon className="h-6 w-6 text-indigo-600 mr-2" />
                {t("tasks.reassignTask")}
              </h3>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setAssigneeEmail("");
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
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

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  {t("tasks.reassignDescription")}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("tasks.assigneeEmail")}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={assigneeEmail}
                  onChange={(e) => setAssigneeEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setAssigneeEmail("");
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleAssignSubmit}
                  disabled={submitting || !assigneeEmail.trim()}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      {t("common.submitting")}
                    </div>
                  ) : (
                    t("tasks.assignTask")
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
export default TaskApprovalActions;
