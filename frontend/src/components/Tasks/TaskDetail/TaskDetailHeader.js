// src/components/Tasks/TaskDetail/TaskDetailHeader.js
import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeftIcon,
  LinkIcon,
  ClipboardDocumentIcon,
  CalendarIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleIconSolid } from "@heroicons/react/24/solid";
import StatusBadge from "./TaskStatusBadge";
import PriorityBadge from "./TaskPriorityBadge";
import TaskActions from "./TaskActions";
import TaskMetadata from "./TaskMetaData";

const TaskDetailHeader = ({
  task,
  onStatusChange,
  onShowForm,
  onApprovalAction,
  submitting,
  form,
}) => {
  const { t } = useTranslation();

  // Check if this is an approval task
  const isApprovalTask =
    task.type === "approval" || task.step_type === "approval";

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-4 mb-4">
          <Link
            to="/tasks"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            {t("tasks.backToList")}
          </Link>
          <span className="text-gray-300">•</span>
          <Link
            to={`/workflows/instances/${task.workflow_instance_id}`}
            className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <LinkIcon className="h-4 w-4 mr-1" />
            View Workflow Instance
          </Link>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              {isApprovalTask && (
                <ShieldCheckIcon className="h-6 w-6 text-blue-600" />
              )}
              <h1 className="text-2xl font-bold text-gray-900">{task.name}</h1>
              {isApprovalTask && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {t("tasks.approval")}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
              <span className="flex items-center">
                <ClipboardDocumentIcon className="h-4 w-4 mr-1" />
                {task.workflow_title}
              </span>
              {task.created_at && (
                <span className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  Created {new Date(task.created_at).toLocaleDateString()}
                </span>
              )}
            </div>

            {task.description && (
              <p className="text-gray-700 mb-4">{task.description}</p>
            )}

            {task.instructions && (
              <div
                className={`${
                  isApprovalTask
                    ? "bg-blue-50 border-blue-200"
                    : "bg-blue-50 border-blue-200"
                } border rounded-lg p-4 mb-4`}
              >
                <h3
                  className={`text-sm font-medium ${
                    isApprovalTask ? "text-blue-900" : "text-blue-900"
                  } mb-2 flex items-center`}
                >
                  <InformationCircleIcon className="h-4 w-4 mr-1" />
                  {isApprovalTask
                    ? t("tasks.approvalInstructions")
                    : t("tasks.instructions")}
                </h3>
                <p
                  className={`${
                    isApprovalTask ? "text-blue-800" : "text-blue-800"
                  } text-sm`}
                >
                  {task.instructions}
                </p>
              </div>
            )}

            {/* Approval-specific information */}
            {isApprovalTask && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <h3 className="text-sm font-medium text-yellow-900 mb-2 flex items-center">
                  <ShieldCheckIcon className="h-4 w-4 mr-1" />
                  {t("tasks.approvalDetails")}
                </h3>
                <div className="text-yellow-800 text-sm space-y-1">
                  {task.approval_type && (
                    <div>
                      <span className="font-medium">
                        {t("tasks.approvalType")}:
                      </span>{" "}
                      {task.approval_type}
                    </div>
                  )}
                  {task.approvers && task.approvers.length > 0 && (
                    <div>
                      <span className="font-medium">
                        {t("tasks.requiredApprovers")}:
                      </span>{" "}
                      {task.approvers.join(", ")}
                    </div>
                  )}
                  {task.approval_deadline && (
                    <div>
                      <span className="font-medium">
                        {t("tasks.approvalDeadline")}:
                      </span>{" "}
                      {new Date(task.approval_deadline).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-end space-y-3">
            <div className="flex items-center space-x-2">
              <StatusBadge status={task.status} />
              {task.priority && <PriorityBadge priority={task.priority} />}
            </div>

            <TaskActions
              task={task}
              form={form}
              onStatusChange={onStatusChange}
              onShowForm={onShowForm}
              onApprovalAction={onApprovalAction}
              submitting={submitting}
            />
          </div>
        </div>
      </div>

      <TaskMetadata task={task} />

      {task.status === "completed" && (
        <div
          className={`px-6 py-4 ${
            isApprovalTask ? "bg-green-50" : "bg-green-50"
          } border-t border-gray-200 rounded-b-lg`}
        >
          <div className="flex items-center">
            <CheckCircleIconSolid className="h-5 w-5 text-green-400 mr-2" />
            <div>
              <p className="text-green-800 font-medium">
                {isApprovalTask
                  ? t("tasks.approvalCompleted")
                  : t("tasks.taskCompletedMessage")}
              </p>
              {task.completed_at && (
                <p className="text-green-700 text-sm mt-1">
                  {t("tasks.completedAt")}:{" "}
                  {new Date(task.completed_at).toLocaleString()}
                </p>
              )}
              {task.approval_decision && (
                <p className="text-green-700 text-sm mt-1">
                  <span className="font-medium">{t("tasks.decision")}:</span>{" "}
                  {task.approval_decision}
                </p>
              )}
              {task.approval_comment && (
                <p className="text-green-700 text-sm mt-1">
                  <span className="font-medium">{t("tasks.comment")}:</span>{" "}
                  {task.approval_comment}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskDetailHeader;
