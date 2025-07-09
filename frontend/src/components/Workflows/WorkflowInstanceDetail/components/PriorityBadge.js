import React from "react";
import { useTranslation } from "react-i18next";

export const PriorityBadge = ({ priority }) => {
  const { t } = useTranslation();

  const priorityConfig = {
    low: { color: "bg-gray-100 text-gray-800", emoji: "🟢" },
    medium: { color: "bg-blue-100 text-blue-800", emoji: "🟡" },
    high: { color: "bg-orange-100 text-orange-800", emoji: "🟠" },
    urgent: { color: "bg-red-100 text-red-800", emoji: "🔴" },
  };

  const config = priorityConfig[priority] || priorityConfig.medium;

  return (
    <span
      className={`inline-flex items-center px-2 py-1 text-xs rounded-full font-medium ${config.color}`}
    >
      <span className="mr-1">{config.emoji}</span>
      {t(`common.${priority}`, {
        defaultValue: priority?.charAt(0).toUpperCase() + priority?.slice(1),
      })}
    </span>
  );
};
