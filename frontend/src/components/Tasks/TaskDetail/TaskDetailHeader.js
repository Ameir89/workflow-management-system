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
  submitting,
  form,
}) => {
  const { t } = useTranslation();

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
              <h1 className="text-2xl font-bold text-gray-900">{task.name}</h1>
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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
                  <InformationCircleIcon className="h-4 w-4 mr-1" />
                  {t("tasks.instructions")}
                </h3>
                <p className="text-blue-800 text-sm">{task.instructions}</p>
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
              submitting={submitting}
            />
          </div>
        </div>
      </div>

      <TaskMetadata task={task} />

      {task.status === "completed" && (
        <div className="px-6 py-4 bg-green-50 border-t border-gray-200 rounded-b-lg">
          <div className="flex items-center">
            <CheckCircleIconSolid className="h-5 w-5 text-green-400 mr-2" />
            <div>
              <p className="text-green-800 font-medium">
                {t("tasks.taskCompletedMessage")}
              </p>
              {task.completed_at && (
                <p className="text-green-700 text-sm mt-1">
                  {t("tasks.completedAt")}:{" "}
                  {new Date(task.completed_at).toLocaleString()}
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
