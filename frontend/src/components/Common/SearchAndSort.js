// src/components/Admin/NotificationManagement/components/common/SearchAndSort.js
import React from "react";
import { useTranslation } from "react-i18next";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import SearchInput from "../../../../Common/SearchInput";

const SearchAndSort = ({
  search,
  onSearchChange,
  sortField,
  sortDirection,
  onSortChange,
  filters = {},
  onFiltersChange,
  filterOptions = {},
  sortOptions = [],
  placeholder = "Search...",
  showFilters = true,
  showSort = true,
  className = "",
}) => {
  const { t } = useTranslation();

  const defaultSortOptions = [
    { value: "name", label: t("common.name") },
    { value: "created_at", label: t("common.dateCreated") },
    { value: "updated_at", label: t("common.dateModified") },
    { value: "usage_count", label: t("notifications.usage") },
  ];

  const sortOpts = sortOptions.length > 0 ? sortOptions : defaultSortOptions;

  const handleSortFieldChange = (field) => {
    if (sortField === field) {
      // Toggle direction if same field
      const newDirection = sortDirection === "asc" ? "desc" : "asc";
      onSortChange(field, newDirection);
    } else {
      // New field, default to asc
      onSortChange(field, "asc");
    }
  };

  const handleFilterChange = (filterKey, value) => {
    onFiltersChange({
      ...filters,
      [filterKey]: value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== "" && value != null
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Search and Controls Row */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        {/* Search Input */}
        <div className="flex-1">
          <SearchInput
            value={search}
            onChange={onSearchChange}
            onClear={() => onSearchChange("")}
            placeholder={placeholder}
          />
        </div>

        {/* Sort Controls */}
        {showSort && (
          <div className="flex items-center space-x-2">
            <ArrowsUpDownIcon className="h-4 w-4 text-gray-500" />
            <select
              value={sortField || ""}
              onChange={(e) => handleSortFieldChange(e.target.value)}
              className="block px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">{t("common.sortBy")}</option>
              {sortOpts.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {sortField && (
              <button
                onClick={() => handleSortFieldChange(sortField)}
                className="p-2 text-gray-500 hover:text-gray-700 border border-gray-300 rounded-md"
                title={t(
                  `common.sort${sortDirection === "asc" ? "Desc" : "Asc"}`
                )}
              >
                {sortDirection === "asc" ? "↑" : "↓"}
              </button>
            )}
          </div>
        )}

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50"
          >
            <XMarkIcon className="h-4 w-4 mr-2" />
            {t("common.clearFilters")}
          </button>
        )}
      </div>

      {/* Filter Controls */}
      {showFilters && Object.keys(filterOptions).length > 0 && (
        <div className="flex flex-wrap gap-3">
          <FunnelIcon className="h-5 w-5 text-gray-500 mt-2" />

          {Object.entries(filterOptions).map(([filterKey, options]) => (
            <div key={filterKey} className="min-w-0">
              <select
                value={filters[filterKey] || ""}
                onChange={(e) => handleFilterChange(filterKey, e.target.value)}
                className="block px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {/* Active Filters Display */}
      {(search || hasActiveFilters) && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-gray-500">{t("common.activeFilters")}:</span>

          {search && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {t("common.search")}: "{search}"
              <button
                onClick={() => onSearchChange("")}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          )}

          {Object.entries(filters).map(([key, value]) => {
            if (!value) return null;
            const option = filterOptions[key]?.find(
              (opt) => opt.value === value
            );
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

export default SearchAndSort;
