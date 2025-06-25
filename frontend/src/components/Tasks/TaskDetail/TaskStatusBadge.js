import React from "react";
import {
  CheckCircleIcon as CheckCircleIconSolid,
  ClockIcon as ClockIconSolid,
  ExclamationTriangleIcon as ExclamationTriangleIconSolid,
  PlayIcon,
} from "@heroicons/react/24/solid";

const TaskStatusBadge = ({ status }) => {
  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircleIconSolid className="h-6 w-6 text-green-500" />;
      case "pending":
        return <ClockIconSolid className="h-6 w-6 text-yellow-500" />;
      case "in_progress":
        return <PlayIcon className="h-6 w-6 text-blue-500" />;
      case "overdue":
        return (
          <ExclamationTriangleIconSolid className="h-6 w-6 text-red-500" />
        );
      default:
        return <ClockIconSolid className="h-6 w-6 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "text-green-800 bg-green-100 border-green-200";
      case "pending":
        return "text-yellow-800 bg-yellow-100 border-yellow-200";
      case "in_progress":
        return "text-blue-800 bg-blue-100 border-blue-200";
      case "overdue":
        return "text-red-800 bg-red-100 border-red-200";
      default:
        return "text-gray-800 bg-gray-100 border-gray-200";
    }
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
        status
      )}`}
    >
      {getStatusIcon(status)}
      <span className="ml-2 capitalize">{status.replace("_", " ")}</span>
    </span>
  );
};

export default TaskStatusBadge;
