// src/components/Scripts/ScriptExecutionHistory.js
import React, { useState } from "react";
import { useQuery } from "react-query";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { scriptsService } from "../../services/scriptsService";
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  ArrowPathIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  DocumentTextIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const ScriptExecutionHistory = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    status: "",
    date_from: "",
    date_to: "",
    search: "",
  });
  const [selectedExecution, setSelectedExecution] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch execution history
  const {
    data: historyData,
    isLoading,
    error,
    refetch,
  } = useQuery(
    ["script-execution-history", id, page, filters],
    () =>
      scriptsService.getScriptExecutionHistory(id, {
        page,
        limit: 20,
        ...filters,
      }),
    {
      keepPreviousData: true,
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );

  const getStatusIcon = (status) => {
    switch (status) {
      case "success":
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case "timeout":
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case "running":
        return <ArrowPathIcon className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "success":
        return "text-green-800 bg-green-100";
      case "error":
        return "text-red-800 bg-red-100";
      case "timeout":
        return "text-yellow-800 bg-yellow-100";
      case "running":
        return "text-blue-800 bg-blue-100";
      default:
        return "text-gray-800 bg-gray-100";
    }
  };

  const formatDuration = (durationMs) => {
    if (!durationMs) return "N/A";

    if (durationMs < 1000) {
      return `${durationMs}ms`;
    } else if (durationMs < 60000) {
      return `${(durationMs / 1000).toFixed(2)}s`;
    } else {
      const minutes = Math.floor(durationMs / 60000);
      const seconds = ((durationMs % 60000) / 1000).toFixed(0);
      return `${minutes}m ${seconds}s`;
    }
  };

  const ExecutionDetailModal = ({ execution, onClose }) => {
    if (!execution) return null;

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              Execution Details
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">
                Execution Information
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Status:</span>
                  <span
                    className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      execution.status
                    )}`}
                  >
                    {execution.status}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Duration:</span>
                  <span className="ml-2">
                    {formatDuration(execution.duration_ms)}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Started:</span>
                  <span className="ml-2">
                    {new Date(execution.started_at).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Finished:</span>
                  <span className="ml-2">
                    {execution.finished_at
                      ? new Date(execution.finished_at).toLocaleString()
                      : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Triggered By:</span>
                  <span className="ml-2">
                    {execution.triggered_by || "System"}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Execution ID:</span>
                  <span className="ml-2 font-mono text-xs">{execution.id}</span>
                </div>
              </div>
            </div>

            {/* Input Data */}
            {execution.input_data && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Input Data</h4>
                <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm max-h-40">
                  {JSON.stringify(execution.input_data, null, 2)}
                </pre>
              </div>
            )}

            {/* Output Data */}
            {execution.output_data && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Output Data</h4>
                <pre className="bg-green-50 p-4 rounded-lg overflow-auto text-sm max-h-40 border border-green-200">
                  {JSON.stringify(execution.output_data, null, 2)}
                </pre>
              </div>
            )}

            {/* Error Information */}
            {execution.error_message && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  Error Details
                </h4>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <p className="text-red-800 font-medium">
                    {execution.error_message}
                  </p>
                  {execution.error_stack && (
                    <pre className="mt-2 text-xs text-red-700 overflow-auto max-h-32">
                      {execution.error_stack}
                    </pre>
                  )}
                </div>
              </div>
            )}

            {/* Logs */}
            {execution.logs && execution.logs.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  Execution Logs
                </h4>
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-auto">
                  {execution.logs.map((log, index) => (
                    <div key={index} className="mb-1">
                      <span className="text-gray-500">
                        [{new Date(log.timestamp).toLocaleTimeString()}]
                      </span>{" "}
                      <span
                        className={`${
                          log.level === "error"
                            ? "text-red-400"
                            : log.level === "warn"
                            ? "text-yellow-400"
                            : log.level === "info"
                            ? "text-blue-400"
                            : "text-green-400"
                        }`}
                      >
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <XCircleIcon className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          Error Loading History
        </h3>
        <p className="mt-1 text-sm text-gray-500">{error.message}</p>
        <button
          onClick={() => refetch()}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <ArrowPathIcon className="h-4 w-4 mr-2" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Execution History
          </h2>
          <p className="text-sm text-gray-600">
            Track script execution history and performance
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium ${
              showFilters
                ? "border-indigo-500 text-indigo-700 bg-indigo-50"
                : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
            }`}
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters
          </button>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Statistics */}
      {historyData?.statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-8 w-8 text-blue-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">
                  Total Executions
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {historyData.statistics.total_executions}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-8 w-8 text-green-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">
                  Success Rate
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {historyData.statistics.success_rate}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-purple-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">
                  Avg Duration
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatDuration(historyData.statistics.avg_duration_ms)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CalendarDaysIcon className="h-8 w-8 text-orange-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Last 24h</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {historyData.statistics.executions_last_24h}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Status</option>
                <option value="success">Success</option>
                <option value="error">Error</option>
                <option value="timeout">Timeout</option>
                <option value="running">Running</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date From
              </label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) =>
                  setFilters({ ...filters, date_from: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date To
              </label>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) =>
                  setFilters({ ...filters, date_to: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                  placeholder="Search executions..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Execution History Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Started
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Triggered By
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Result
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {historyData?.executions?.map((execution) => (
              <tr key={execution.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {getStatusIcon(execution.status)}
                    <span
                      className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                        execution.status
                      )}`}
                    >
                      {execution.status}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(execution.started_at).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDuration(execution.duration_ms)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {execution.triggered_by || "System"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {execution.status === "error" ? (
                    <span className="text-red-600 truncate max-w-xs block">
                      {execution.error_message}
                    </span>
                  ) : execution.status === "success" ? (
                    <span className="text-green-600">
                      Completed successfully
                    </span>
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => setSelectedExecution(execution)}
                    className="text-indigo-600 hover:text-indigo-900"
                    title="View details"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {historyData?.executions?.length === 0 && (
        <div className="text-center py-12">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No execution history
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Script execution history will appear here once the script is
            executed.
          </p>
        </div>
      )}

      {/* Pagination */}
      {historyData?.pagination && historyData.pagination.pages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
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
                setPage(Math.min(historyData.pagination.pages, page + 1))
              }
              disabled={page === historyData.pagination.pages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing {(page - 1) * 20 + 1} to{" "}
                {Math.min(page * 20, historyData.pagination.total)} of{" "}
                {historyData.pagination.total} results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setPage(Math.min(historyData.pagination.pages, page + 1))
                  }
                  disabled={page === historyData.pagination.pages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Execution Detail Modal */}
      <ExecutionDetailModal
        execution={selectedExecution}
        onClose={() => setSelectedExecution(null)}
      />
    </div>
  );
};

export default ScriptExecutionHistory;
