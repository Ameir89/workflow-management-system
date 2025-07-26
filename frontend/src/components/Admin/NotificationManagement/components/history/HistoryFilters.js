// src/components/Admin/NotificationManagement/components/History/HistoryFilters.js
import React from "react";
import { useTranslation } from "react-i18next";

const HistoryFilters = ({ search, setSearch, filters, setFilters }) => {
  const { t } = useTranslation();

  const statusOptions = [
    { value: "", label: t("notifications.allStatus") },
    { value: "delivered", label: t("notifications.delivered") },
    { value: "failed", label: t("notifications.failed") },
    { value: "pending", label: t("notifications.pending") },
  ];

  return (
    <div className="flex items-center space-x-4">
      <input
        type="text"
        placeholder={t("notifications.searchNotifications")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      />
      <select
        value={filters.status}
        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      >
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default HistoryFilters;
