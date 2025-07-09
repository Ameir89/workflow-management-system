// src/components/Workflows/WorkflowInstanceDetail/components/TasksTab.js
import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ClipboardDocumentListIcon,
  UserIcon,
  CalendarIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import {
  CheckCircleIcon as CheckCircleIconSolid,
  XCircleIcon as XCircleIconSolid,
  ClockIcon as ClockIconSolid,
  PlayIcon as PlayIconSolid,
} from "@heroicons/react/24/solid";
import StatusBadge from "./StatusBadge";

const TaskItem = ({ task }) => {
  const { t } = useTranslation();

  const getTaskStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircleIconSolid className="h-5 w-5 text-green-600" />;
      case "failed":
        return <XCircleIconSolid className="h-5 w-5 text-red-600" />;
      case "in_progress":
        return <PlayIconSolid className="h-5 w-5 text-blue-600" />;
      case "pending":
        return <ClockIconSolid className="h-5 w-5 text-yellow-600" />;
      default:
        return <ClockIconSolid className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex-shrink-0">{getTaskStatusIcon(task.status)}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <h4 className="text-sm font-medium text-gray-900 truncate">
            {task.name || t("tasks.taskWithId", { id: task.id })}
          </h4>
          <StatusBadge status={task.status} size="sm" />
        </div>
        <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
          {task.assigned_to && (
            <span className="flex items-center">
              <UserIcon className="h-3 w-3 mr-1" />
              {task.assigned_to_name || task.assigned_to}
            </span>
          )}
          {task.due_date && (
            <span className="flex items-center">
              <CalendarIcon className="h-3 w-3 mr-1" />
              {new Date(task.due_date).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Link
          to={`/tasks/${task.id}`}
          className="text-gray-400 hover:text-gray-600"
          title={t("tasks.viewTask")}
        >
          <EyeIcon className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
};

const TasksTab = ({ tasks, instanceId, onTaskUpdate }) => {
  const { t } = useTranslation();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">
          {t("workflows.tasksWithCount", { count: tasks.length })}
        </h3>
        <Link
          to={`/tasks?workflow_instance_id=${instanceId}`}
          className="text-sm text-indigo-600 hover:text-indigo-800"
        >
          {t("workflows.viewAllTasks")} →
        </Link>
      </div>

      {tasks.length > 0 ? (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {t("workflows.noTasksFound")}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {t("workflows.noTasksFoundDescription")}
          </p>
        </div>
      )}
    </div>
  );
};

export default TasksTab;
