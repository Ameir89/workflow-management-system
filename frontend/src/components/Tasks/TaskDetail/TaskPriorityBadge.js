import React from "react";
import { FlagIcon } from "@heroicons/react/24/outline";

const TaskPriorityBadge = ({ priority }) => {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case "urgent":
        return "text-red-700 bg-red-50 border-red-200";
      case "high":
        return "text-orange-700 bg-orange-50 border-orange-200";
      case "medium":
        return "text-yellow-700 bg-yellow-50 border-yellow-200";
      case "low":
        return "text-green-700 bg-green-50 border-green-200";
      default:
        return "text-gray-700 bg-gray-50 border-gray-200";
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(
        priority
      )}`}
    >
      <FlagIcon className="h-3 w-3 mr-1" />
      {priority}
    </span>
  );
};

export default TaskPriorityBadge;
