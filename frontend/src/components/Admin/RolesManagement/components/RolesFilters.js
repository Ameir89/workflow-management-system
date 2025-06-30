// src/components/Admin/RolesManagement/components/RolesFilters.js
import React from "react";
import { useTranslation } from "react-i18next";
import { MagnifyingGlassIcon, FunnelIcon } from "@heroicons/react/24/outline";
import ViewToggle from "./ViewToggle";

const RolesFilters = ({
  filters,
  onFiltersChange,
  resultsCount,
  viewMode,
  onViewModeChange,
}) => {
  const { t } = useTranslation();

  const handleSearchChange = (e) => {
    onFiltersChange({ search: e.target.value });
  };

  const handleStatusChange = (e) => {
    onFiltersChange({ status: e.target.value });
  };

  const handleSortChange = (e) => {
    const [sortBy, sortOrder] = e.target.value.split(":");
    onFiltersChange({ sortBy, sortOrder });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      status: "all",
      sortBy: "name",
      sortOrder: "asc",
    });
  };

  const hasActiveFilters = filters.search || filters.status !== "all";

  return (
    <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 min-w-0">
            <MagnifyingGlassIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder={t(
                "admin.roles.searchPlaceholder",
                "Search roles..."
              )}
              value={filters.search}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-4 w-4 text-gray-400" />
            <select
              value={filters.status}
              onChange={handleStatusChange}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">{t("common.allStatus", "All Status")}</option>
              <option value="active">{t("common.active", "Active")}</option>
              <option value="inactive">
                {t("common.inactive", "Inactive")}
              </option>
              <option value="system">
                {t("admin.roles.systemRoles", "System Roles")}
              </option>
            </select>
          </div>

          {/* Sort Options */}
          <select
            value={`${filters.sortBy}:${filters.sortOrder}`}
            onChange={handleSortChange}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="name:asc">
              {t("admin.roles.sortNameAsc", "Name A-Z")}
            </option>
            <option value="name:desc">
              {t("admin.roles.sortNameDesc", "Name Z-A")}
            </option>
            <option value="created_at:desc">
              {t("admin.roles.sortNewest", "Newest First")}
            </option>
            <option value="created_at:asc">
              {t("admin.roles.sortOldest", "Oldest First")}
            </option>
            <option value="user_count:desc">
              {t("admin.roles.sortMostUsers", "Most Users")}
            </option>
          </select>
        </div>

        {/* View Toggle and Results */}
        <div className="flex items-center gap-4">
          {/* View Toggle */}
          <ViewToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />

          {/* Results and Clear */}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>
              {t("admin.roles.resultsCount", "{{count}} roles", {
                count: resultsCount,
              })}
            </span>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-indigo-600 hover:text-indigo-800 font-medium"
              >
                {t("common.clearFilters", "Clear Filters")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RolesFilters;
