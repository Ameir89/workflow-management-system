// src/components/Workflows/WorkflowInstancesDashboard.js
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { workflowService } from "../../services/workflowService";
import { workflowExecutionService } from "../../services/workflowExecutionService";
import {
  PlayIcon,
  PauseIcon,
  StopIcon,
  EyeIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  UserIcon,
  DocumentDuplicateIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";

const StatusBadge = ({ status, size = "sm" }) => {
  const statusConfig = {
    pending: {
      color: "bg-yellow-100 text-yellow-800",
      icon: ClockIcon,
      label: "Pending",
    },
    running: {
      color: "bg-blue-100 text-blue-800",
      icon: PlayIcon,
      label: "Running",
    },
    completed: {
      color: "bg-green-100 text-green-800",
      icon: CheckCircleIcon,
      label: "Completed",
    },
    failed: {
      color: "bg-red-100 text-red-800",
      icon: XCircleIcon,
      label: "Failed",
    },
    cancelled: {
      color: "bg-gray-100 text-gray-800",
      icon: StopIcon,
      label: "Cancelled",
    },
    scheduled: {
      color: "bg-purple-100 text-purple-800",
      icon: CalendarIcon,
      label: "Scheduled",
    },
  };

  const config = statusConfig[status] || statusConfig.pending;
  const IconComponent = config.icon;
  const sizeClasses =
    size === "lg" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex items-center ${sizeClasses} rounded-full font-medium ${config.color}`}
    >
      <IconComponent
        className={`${size === "lg" ? "h-4 w-4" : "h-3 w-3"} mr-1`}
      />
      {config.label}
    </span>
  );
};

const InstanceCard = ({ instance, onAction }) => {
  const { t } = useTranslation();

  const getDuration = () => {
    if (!instance.started_at) return "Not started";

    const start = new Date(instance.started_at);
    const end = instance.completed_at
      ? new Date(instance.completed_at)
      : new Date();
    const diffMs = end - start;

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getProgress = () => {
    if (!instance.total_steps) return 0;
    return Math.round((instance.completed_steps / instance.total_steps) * 100);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-medium text-gray-900 truncate">
              {instance.title || `Instance ${instance.id}`}
            </h3>
            <StatusBadge status={instance.status} />
          </div>

          <p className="text-sm text-gray-600 mt-1">{instance.workflow_name}</p>

          {instance.description && (
            <p className="text-sm text-gray-500 mt-2 line-clamp-2">
              {instance.description}
            </p>
          )}
        </div>

        <div className="flex items-center space-x-2 ml-4">
          <Link
            to={`/workflows/instances/${instance.id}`}
            className="text-gray-400 hover:text-gray-600"
            title="View details"
          >
            <EyeIcon className="h-5 w-5" />
          </Link>

          {instance.status === "running" && (
            <button
              onClick={() => onAction("pause", instance.id)}
              className="text-yellow-400 hover:text-yellow-600"
              title="Pause"
            >
              <PauseIcon className="h-5 w-5" />
            </button>
          )}

          {instance.status === "paused" && (
            <button
              onClick={() => onAction("resume", instance.id)}
              className="text-green-400 hover:text-green-600"
              title="Resume"
            >
              <PlayIcon className="h-5 w-5" />
            </button>
          )}

          {["running", "paused", "pending"].includes(instance.status) && (
            <button
              onClick={() => onAction("cancel", instance.id)}
              className="text-red-400 hover:text-red-600"
              title="Cancel"
            >
              <StopIcon className="h-5 w-5" />
            </button>
          )}

          <button
            onClick={() => onAction("clone", instance.id)}
            className="text-blue-400 hover:text-blue-600"
            title="Clone instance"
          >
            <DocumentDuplicateIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {instance.status === "running" && instance.total_steps > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>
              {instance.completed_steps}/{instance.total_steps} steps
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgress()}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Instance Metadata */}
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center text-gray-600">
          <UserIcon className="h-4 w-4 mr-2" />
          <span>{instance.started_by_name || "System"}</span>
        </div>

        <div className="flex items-center text-gray-600">
          <ClockIcon className="h-4 w-4 mr-2" />
          <span>{getDuration()}</span>
        </div>

        {instance.priority && (
          <div className="flex items-center">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                instance.priority === "urgent"
                  ? "bg-red-100 text-red-800"
                  : instance.priority === "high"
                  ? "bg-orange-100 text-orange-800"
                  : instance.priority === "medium"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {instance.priority} priority
            </span>
          </div>
        )}

        {instance.due_date && (
          <div className="flex items-center text-gray-600">
            <CalendarIcon className="h-4 w-4 mr-2" />
            <span>Due {new Date(instance.due_date).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {/* Current Step */}
      {instance.current_step && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="text-sm font-medium text-blue-900">
            Current Step: {instance.current_step.name}
          </div>
          {instance.current_step.assignee && (
            <div className="text-xs text-blue-700 mt-1">
              Assigned to: {instance.current_step.assignee}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const WorkflowInstancesDashboard = () => {
  const { t } = useTranslation();
  const { workflowId } = useParams(); // Optional - for single workflow view
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    assignee: "",
    search: "",
  });
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState("grid"); // grid or list

  // Fetch instances
  const {
    data: instancesData,
    isLoading,
    refetch,
  } = useQuery(
    ["workflow-instances", workflowId, filters, page],
    () => {
      if (workflowId) {
        return workflowService.getWorkflowInstances(workflowId, {
          ...filters,
          page,
          limit: 20,
        });
      } else {
        // Check if getAllWorkflowInstances method exists, fallback if not
        if (typeof workflowService.getAllWorkflowInstances === "function") {
          return workflowService.getAllWorkflowInstances({
            ...filters,
            page,
            limit: 20,
          });
        } else {
          // Fallback: get instances from all workflows endpoint
          return workflowService
            .getWorkflows({
              include_instances: true,
              ...filters,
              page,
              limit: 20,
            })
            .then((response) => ({
              instances:
                response.workflows?.flatMap((w) => w.instances || []) || [],
              pagination: response.pagination,
            }));
        }
      }
    },
    {
      keepPreviousData: true,
      refetchInterval: 30000, // Auto-refresh every 30 seconds
    }
  );

  // Fetch dashboard stats
  const { data: dashboardStats } = useQuery(
    ["workflow-dashboard-stats", workflowId],
    () => {
      // Only pass workflowId if it exists and is valid
      const validWorkflowId =
        workflowId && workflowId !== "undefined" && workflowId !== "null"
          ? workflowId
          : null;
      return workflowService.getDashboardStats(validWorkflowId);
    },
    {
      refetchInterval: 60000,
      // Provide default data in case of error
      onError: (error) => {
        console.warn("Failed to fetch dashboard stats:", error.message);
      },
    }
  );

  // Instance actions mutation
  const instanceActionMutation = useMutation(
    async ({ action, instanceId, params }) => {
      switch (action) {
        case "pause":
          return workflowService.pauseWorkflowInstance(instanceId);
        case "resume":
          return workflowService.resumeWorkflowInstance(instanceId);
        case "cancel":
          return workflowService.cancelWorkflowInstance(instanceId);
        case "clone":
          return workflowExecutionService.cloneWorkflowInstance(
            instanceId,
            params
          );
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    },
    {
      onSuccess: (data, variables) => {
        const actionMessages = {
          pause: "Instance paused successfully",
          resume: "Instance resumed successfully",
          cancel: "Instance cancelled successfully",
          clone: "Instance cloned successfully",
        };
        toast.success(actionMessages[variables.action]);
        queryClient.invalidateQueries(["workflow-instances"]);
        refetch();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );

  const handleInstanceAction = (action, instanceId, params = {}) => {
    if (action === "cancel") {
      if (
        !window.confirm(
          "Are you sure you want to cancel this workflow instance?"
        )
      ) {
        return;
      }
    }

    instanceActionMutation.mutate({ action, instanceId, params });
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page
  };

  const clearFilters = () => {
    setFilters({
      status: "",
      priority: "",
      assignee: "",
      search: "",
    });
    setPage(1);
  };

  const getStatusCounts = () => {
    // Provide default status counts if data is not available
    const defaultCounts = {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      scheduled: 0,
    };

    if (!dashboardStats?.status_counts) {
      return defaultCounts;
    }

    // Merge with defaults to ensure all statuses are present
    return { ...defaultCounts, ...dashboardStats.status_counts };
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
            {workflowId ? "Workflow Instances" : "All Workflow Instances"}
          </h1>
          <p className="text-gray-600">
            Monitor and manage workflow execution instances
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Refresh
          </button>

          {workflowId && (
            <Link
              to={`/workflows/designer/${workflowId}`}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <ChartBarIcon className="h-4 w-4 mr-2" />
              View Workflow
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {Object.entries(getStatusCounts()).map(([status, count]) => (
          <div
            key={status}
            className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 capitalize">
                  {status}
                </p>
                <p className="text-2xl font-semibold text-gray-900">{count}</p>
              </div>
              <StatusBadge status={status} size="lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <FunnelIcon className="h-5 w-5 mr-2" />
            Filters
          </h3>
          <button
            onClick={clearFilters}
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            Clear All
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search instances..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              value={filters.priority}
              onChange={(e) => handleFilterChange("priority", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              View Mode
            </label>
            <div className="flex rounded-md shadow-sm">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-3 py-2 text-sm font-medium rounded-l-md border ${
                  viewMode === "grid"
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-2 text-sm font-medium rounded-r-md border-l-0 border ${
                  viewMode === "list"
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                List
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Instances Grid/List */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {instancesData?.instances?.map((instance) => (
            <InstanceCard
              key={instance.id}
              instance={instance}
              onAction={handleInstanceAction}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {instancesData?.instances?.map((instance) => (
              <li key={instance.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {instance.title || `Instance ${instance.id}`}
                      </h3>
                      <StatusBadge status={instance.status} />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {instance.workflow_name} • Started by{" "}
                      {instance.started_by_name}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* Action buttons would go here */}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Empty State */}
      {instancesData?.instances?.length === 0 && (
        <div className="text-center py-12">
          <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No workflow instances found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {workflowId
              ? "This workflow hasn't been executed yet."
              : "No workflow instances match your current filters."}
          </p>
        </div>
      )}

      {/* Pagination */}
      {instancesData?.pagination && instancesData.pagination.pages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setPage(Math.min(instancesData.pagination.pages, page + 1))
              }
              disabled={page === instancesData.pagination.pages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing {(page - 1) * 20 + 1} to{" "}
                {Math.min(page * 20, instancesData.pagination.total)} of{" "}
                {instancesData.pagination.total} results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setPage(Math.min(instancesData.pagination.pages, page + 1))
                  }
                  disabled={page === instancesData.pagination.pages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowInstancesDashboard;
