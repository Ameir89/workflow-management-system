// src/components/Admin/NotificationManagement/components/common/NotificationFilters.js
import React from "react";
import { useTranslation } from "react-i18next";
import { FunnelIcon, XMarkIcon } from "@heroicons/react/24/outline";
import SearchInput from "../../../../Common/SearchInput";

const NotificationFilters = ({
  search,
  setSearch,
  filters,
  setFilters,
  onReset,
  filterOptions = {},
  className = "",
}) => {
  const { t } = useTranslation();

  const defaultFilterOptions = {
    status: [
      { value: "", label: t("notifications.allStatus") },
      { value: "active", label: t("notifications.active") },
      { value: "inactive", label: t("notifications.inactive") },
      { value: "draft", label: t("notifications.draft") },
    ],
    channel: [
      { value: "", label: t("notifications.allChannels") },
      { value: "email", label: t("notifications.channelEmail") },
      { value: "sms", label: t("notifications.channelSMS") },
      { value: "in_app", label: t("notifications.channelInApp") },
    ],
    category: [
      { value: "", label: t("notifications.allCategories") },
      { value: "task", label: t("notifications.categoryTask") },
      { value: "workflow", label: t("notifications.categoryWorkflow") },
      { value: "system", label: t("notifications.categorySystem") },
      { value: "reminder", label: t("notifications.categoryReminder") },
      { value: "alert", label: t("notifications.categoryAlert") },
    ],
    type: [
      { value: "", label: t("notifications.allTypes") },
      { value: "template", label: t("notifications.template") },
      { value: "system", label: t("notifications.system") },
      { value: "custom", label: t("notifications.custom") },
    ],
  };

  const options = { ...defaultFilterOptions, ...filterOptions };

  const hasActiveFilters =
    search || Object.values(filters).some((value) => value);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearAllFilters = () => {
    setSearch("");
    setFilters({});
    if (onReset) {
      onReset();
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            onClear={() => setSearch("")}
            placeholder={t("notifications.searchPlaceholder")}
          />
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <XMarkIcon className="h-4 w-4 mr-2" />
            {t("common.clearFilters")}
          </button>
        )}
      </div>

      {/* Filter Dropdowns */}
      <div className="flex flex-wrap gap-4">
        {Object.entries(options).map(([filterKey, filterOptions]) => (
          <div key={filterKey} className="min-w-0 flex-shrink-0">
            <select
              value={filters[filterKey] || ""}
              onChange={(e) => handleFilterChange(filterKey, e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <FunnelIcon className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-500">
            {t("common.activeFilters")}:
          </span>

          {search && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {t("common.search")}: "{search}"
              <button
                onClick={() => setSearch("")}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          )}

          {Object.entries(filters).map(([key, value]) => {
            if (!value) return null;
            const option = options[key]?.find((opt) => opt.value === value);
            if (!option) return null;

            return (
              <span
                key={key}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
              >
                {option.label}
                <button
                  onClick={() => handleFilterChange(key, "")}
                  className="ml-1 text-gray-600 hover:text-gray-800"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationFilters;
