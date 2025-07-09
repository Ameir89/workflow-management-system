import React, { useState } from "react";
import { useQuery } from "react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { workflowService } from "../../services/workflowService";
import {
  RocketLaunchIcon,
  ClockIcon,
  EyeIcon,
  CalendarIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import StatusBadge from "./WorkflowInstanceDetail/components/StatusBadge";
import { PriorityBadge } from "./WorkflowInstanceDetail/components/PriorityBadge";

const MyWorkflowInstances = () => {
  const { t } = useTranslation();

  // Separate the search input value from the actual search filters
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    search: "",
  });
  const [page, setPage] = useState(1);

  // Fetch user's workflow instances
  const { data: instancesData, isLoading } = useQuery(
    ["my-workflow-instances", filters, page],
    () =>
      workflowService.getMyWorkflowInstances({
        ...filters,
        page,
        limit: 20,
      }),
    {
      keepPreviousData: true,
      refetchInterval: 30000, // Auto-refresh every 30 seconds
    }
  );

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  // Handle search input change (only updates local state)
  const handleSearchInputChange = (e) => {
    setSearchInput(e.target.value);
  };

  // Handle search button click (triggers API call)
  const handleSearchClick = () => {
    setFilters((prev) => ({ ...prev, search: searchInput }));
    setPage(1);
  };

  // Handle Enter key press in search input
  const handleSearchKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearchClick();
    }
  };

  const clearFilters = () => {
    setSearchInput("");
    setFilters({
      status: "",
      priority: "",
      search: "",
    });
    setPage(1);
  };

  const getDuration = (instance) => {
    if (!instance.started_at) return t("myWorkflows.duration.notStarted");

    const start = new Date(instance.started_at);
    const end = instance.completed_at
      ? new Date(instance.completed_at)
      : new Date();
    const diffMs = end - start;

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return t("myWorkflows.duration.days", { days, hours });
    if (hours > 0) return t("myWorkflows.duration.hours", { hours, minutes });
    return t("myWorkflows.duration.minutes", { minutes });
  };

  const getProgress = (instance) => {
    if (!instance.total_steps) return 0;
    return Math.round((instance.completed_steps / instance.total_steps) * 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t("myWorkflows.title")}
          </h1>
          <p className="text-gray-600">{t("myWorkflows.subtitle")}</p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/start-workflows"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <RocketLaunchIcon className="h-4 w-4 mr-2" />
            {t("myWorkflows.startNewWorkflow")}
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <FunnelIcon className="h-5 w-5 mr-2" />
            {t("myWorkflows.filters.title")}
          </h3>
          <button
            onClick={clearFilters}
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            {t("myWorkflows.filters.clearAll")}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search Input with Button */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("myWorkflows.filters.search")}
            </label>
            <div className="flex">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t("myWorkflows.filters.searchPlaceholder")}
                  value={searchInput}
                  onChange={handleSearchInputChange}
                  onKeyPress={handleSearchKeyPress}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <button
                onClick={handleSearchClick}
                className="px-4 py-2 bg-indigo-600 text-white rounded-r-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 border border-indigo-600"
              >
                <MagnifyingGlassIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("myWorkflows.filters.status")}
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{t("myWorkflows.filters.allStatuses")}</option>
              <option value="pending">{t("myWorkflows.stats.pending")}</option>
              <option value="running">{t("myWorkflows.stats.running")}</option>
              <option value="completed">
                {t("myWorkflows.stats.completed")}
              </option>
              <option value="failed">{t("myWorkflows.stats.failed")}</option>
              <option value="cancelled">
                {t("myWorkflows.stats.cancelled")}
              </option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("myWorkflows.filters.priority")}
            </label>
            <select
              value={filters.priority}
              onChange={(e) => handleFilterChange("priority", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{t("myWorkflows.filters.allPriorities")}</option>
              <option value="low">{t("common.low")}</option>
              <option value="medium">{t("common.medium")}</option>
              <option value="high">{t("common.high")}</option>
              <option value="urgent">{t("common.urgent")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Instances List */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {t("myWorkflows.instancesCount", {
              count: instancesData?.instances?.length || 0,
            })}
          </h3>
        </div>

        {instancesData?.instances?.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {instancesData.instances.map((instance) => (
              <div key={instance.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-medium text-gray-900 truncate">
                        {instance.title || `Instance ${instance.id}`}
                      </h4>
                      <StatusBadge status={instance.status} />
                      {instance.priority && (
                        <PriorityBadge priority={instance.priority} />
                      )}
                    </div>

                    <p className="text-sm text-gray-600 mb-3">
                      {instance.workflow_name}
                    </p>

                    {instance.description && (
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                        {instance.description}
                      </p>
                    )}

                    {/* Progress Bar for Running Instances */}
                    {instance.status === "running" &&
                      instance.total_steps > 0 && (
                        <div className="mb-3">
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>{t("myWorkflows.progress")}</span>
                            <span>
                              {t("myWorkflows.stepsCompleted", {
                                completed: instance.completed_steps,
                                total: instance.total_steps,
                              })}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${getProgress(instance)}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                    {/* Instance Metadata */}
                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                      <div className="flex items-center">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        <span>
                          {t("myWorkflows.duration", {
                            duration: getDuration(instance),
                          })}
                        </span>
                      </div>

                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        <span>
                          {t("myWorkflows.started", {
                            date: new Date(
                              instance.created_at
                            ).toLocaleDateString(),
                          })}
                        </span>
                      </div>

                      {instance.due_date && (
                        <div className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          <span>
                            {t("myWorkflows.due", {
                              date: new Date(
                                instance.due_date
                              ).toLocaleDateString(),
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Link
                      to={`/workflows/instances/${instance.id}`}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <EyeIcon className="h-4 w-4 mr-2" />
                      {t("myWorkflows.viewDetails")}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <RocketLaunchIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {t("myWorkflows.noInstancesFound")}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {filters.search || filters.status || filters.priority
                ? t("myWorkflows.noFilterResults")
                : t("myWorkflows.noInstancesMessage")}
            </p>
            {!(filters.search || filters.status || filters.priority) && (
              <div className="mt-6">
                <Link
                  to="/start-workflows"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <RocketLaunchIcon className="h-4 w-4 mr-2" />
                  {t("myWorkflows.startFirstWorkflow")}
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {instancesData?.pagination && instancesData.pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() =>
                  setPage(Math.min(instancesData.pagination.pages, page + 1))
                }
                disabled={page === instancesData.pagination.pages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  {t("common.showingResults", {
                    from: (page - 1) * 20 + 1,
                    to: Math.min(page * 20, instancesData.pagination.total),
                    total: instancesData.pagination.total,
                  })}
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {t("common.previous")}
                  </button>
                  <button
                    onClick={() =>
                      setPage(
                        Math.min(instancesData.pagination.pages, page + 1)
                      )
                    }
                    disabled={page === instancesData.pagination.pages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {t("common.next")}
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyWorkflowInstances;
