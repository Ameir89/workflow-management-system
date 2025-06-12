import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

const RecentTasks = ({ tasks = [] }) => {
  const { t } = useTranslation();

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case "pending":
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case "overdue":
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "text-green-800 bg-green-100";
      case "pending":
        return "text-yellow-800 bg-yellow-100";
      case "overdue":
        return "text-red-800 bg-red-100";
      default:
        return "text-gray-800 bg-gray-100";
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {t("dashboard.recentTasks")}
        </h3>
        <Link
          to="/tasks"
          className="text-sm text-indigo-600 hover:text-indigo-800"
        >
          {t("dashboard.viewAllTasks")}
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-8">
          <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {t("tasks.noTasks")}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {t("tasks.noTasksDescription")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Link
              key={task.id}
              to={`/tasks/${task.id}`}
              className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(task.status)}
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {task.name}
                    </p>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {task.workflow_title}
                  </p>
                  <div className="flex items-center text-xs text-gray-400 mt-2">
                    <UserIcon className="h-3 w-3 mr-1" />
                    <span>{task.assigned_to_name || "Unassigned"}</span>
                    {task.due_date && (
                      <>
                        <span className="mx-2">•</span>
                        <span>
                          Due {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                    task.status
                  )}`}
                >
                  {task.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentTasks;
