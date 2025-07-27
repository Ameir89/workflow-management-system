// src/pages/AutomationEditor/components/AutomationHistory.js
import React, { useState } from "react";
import { useQuery } from "react-query";
import { useTranslation } from "react-i18next";
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  PlayIcon,
  UserIcon,
  CalendarIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import LoadingSpinner from "../../../Common/LoadingSpinner";
import Pagination from "../../../Common/Pagination";
import Modal from "../../../Common/Modal";
import { scriptsService } from "../../../../services/scriptsService";

const AutomationHistory = ({ scriptId }) => {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedExecution, setSelectedExecution] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  // Fetch execution history
  const {
    data: historyData,
    isLoading,
    error,
    refetch,
  } = useQuery(
    ["script-execution-history", scriptId, currentPage],
    () =>
      scriptsService.getScriptExecutionHistory(scriptId, {
        page: currentPage,
        limit: 20,
      }),
    {
      enabled: !!scriptId,
      keepPreviousData: true,
    }
  );

  const executions = historyData?.executions || [];
  const pagination = historyData?.pagination || {};

  // Format duration
  const formatDuration = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
      relative: getRelativeTime(date),
    };
  };

  // Get relative time
  const getRelativeTime = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t("automation.history.justNow");
    if (diffMins < 60)
      return t("automation.history.minutesAgo", { count: diffMins });
    if (diffHours < 24)
      return t("automation.history.hoursAgo", { count: diffHours });
    return t("automation.history.daysAgo", { count: diffDays });
  };

  // Get status info
  const getStatusInfo = (execution) => {
    if (execution.success) {
      return {
        icon: CheckCircleIcon,
        color: "text-green-500",
        bg: "bg-green-100",
        label: t("automation.history.success"),
      };
    } else {
      return {
        icon: XCircleIcon,
        color: "text-red-500",
        bg: "bg-red-100",
        label: t("automation.history.failed"),
      };
    }
  };

  // Handle view details
  const handleViewDetails = (execution) => {
    setSelectedExecution(execution);
    setShowDetails(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text={t("automation.history.loading")} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <XCircleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {t("automation.history.loadError")}
        </h3>
        <p className="text-gray-500 mb-4">{error.message}</p>
        <button onClick={refetch} className="btn btn-primary">
          {t("common.retry")}
        </button>
      </div>
    );
  }

  if (executions.length === 0) {
    return (
      <div className="text-center py-12">
        <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {t("automation.history.noExecutions")}
        </h3>
        <p className="text-gray-500">
          {t("automation.history.noExecutionsDesc")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            {t("automation.history.title")}
          </h3>
          <p className="text-sm text-gray-500">
            {t("automation.history.description")}
          </p>
        </div>
        <button onClick={refetch} className="btn btn-outline btn-sm">
          {t("common.refresh")}
        </button>
      </div>

      {/* Execution List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {executions.map((execution) => {
            const statusInfo = getStatusInfo(execution);
            const dateInfo = formatDate(execution.executed_at);
            const StatusIcon = statusInfo.icon;

            return (
              <li key={execution.id}>
                <div className="px-4 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {/* Status Icon */}
                      <div className={`p-2 rounded-full ${statusInfo.bg}`}>
                        <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
                      </div>

                      {/* Execution Info */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-sm font-medium ${statusInfo.color}`}
                          >
                            {statusInfo.label}
                          </span>
                          <span className="text-sm text-gray-500">
                            {formatDuration(execution.execution_duration_ms)}
                          </span>
                          {execution.is_test && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              <PlayIcon className="h-3 w-3 mr-1" />
                              {t("automation.history.test")}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                          <div className="flex items-center">
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            <span>{dateInfo.relative}</span>
                          </div>
                          <div className="flex items-center">
                            <UserIcon className="h-3 w-3 mr-1" />
                            <span>
                              {execution.executed_by_name ||
                                t("automation.history.system")}
                            </span>
                          </div>
                        </div>

                        {/* Error Message Preview */}
                        {execution.error_message && (
                          <div className="mt-2">
                            <p className="text-xs text-red-600 truncate max-w-md">
                              {execution.error_message}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-400">
                        {dateInfo.time}
                      </span>
                      <button
                        onClick={() => handleViewDetails(execution)}
                        className="btn btn-outline btn-xs"
                      >
                        <EyeIcon className="h-3 w-3 mr-1" />
                        {t("automation.history.details")}
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Pagination */}
      <Pagination
        pagination={pagination}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />

      {/* Execution Details Modal */}
      {showDetails && selectedExecution && (
        <Modal
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          title={t("automation.history.executionDetails")}
          maxWidth="4xl"
        >
          <ExecutionDetails
            execution={selectedExecution}
            onClose={() => setShowDetails(false)}
          />
        </Modal>
      )}
    </div>
  );
};

// Execution Details Component
const ExecutionDetails = ({ execution, onClose }) => {
  const { t } = useTranslation();
  const statusInfo = execution.success
    ? {
        icon: CheckCircleIcon,
        color: "text-green-500",
        bg: "bg-green-100",
        label: t("automation.history.success"),
      }
    : {
        icon: XCircleIcon,
        color: "text-red-500",
        bg: "bg-red-100",
        label: t("automation.history.failed"),
      };

  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <div className={`p-3 rounded-full ${statusInfo.bg}`}>
          <StatusIcon className={`h-6 w-6 ${statusInfo.color}`} />
        </div>
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            {statusInfo.label}
          </h3>
          <p className="text-sm text-gray-500">
            {new Date(execution.executed_at).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Execution Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm font-medium text-gray-900 mb-1">
            {t("automation.history.duration")}
          </div>
          <div className="text-lg text-gray-700">
            {execution.execution_duration_ms < 1000
              ? `${execution.execution_duration_ms}ms`
              : `${(execution.execution_duration_ms / 1000).toFixed(2)}s`}
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm font-medium text-gray-900 mb-1">
            {t("automation.history.executedBy")}
          </div>
          <div className="text-lg text-gray-700">
            {execution.executed_by_name || t("automation.history.system")}
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm font-medium text-gray-900 mb-1">
            {t("automation.history.type")}
          </div>
          <div className="text-lg text-gray-700">
            {execution.is_test ? (
              <span className="inline-flex items-center text-blue-600">
                <PlayIcon className="h-4 w-4 mr-1" />
                {t("automation.history.testExecution")}
              </span>
            ) : (
              <span className="inline-flex items-center text-gray-600">
                <DocumentTextIcon className="h-4 w-4 mr-1" />
                {t("automation.history.production")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Result/Output */}
      {execution.result && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">
            {t("automation.history.output")}
          </h4>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap overflow-auto max-h-64">
              {typeof execution.result === "object"
                ? JSON.stringify(execution.result, null, 2)
                : execution.result}
            </pre>
          </div>
        </div>
      )}

      {/* Error Details */}
      {execution.error_message && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-red-900">
            {t("automation.history.errorDetails")}
          </h4>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <pre className="text-sm text-red-800 whitespace-pre-wrap overflow-auto max-h-64">
              {execution.error_message}
            </pre>
          </div>
        </div>
      )}

      {/* Raw Data (for debugging) */}
      <details className="border border-gray-200 rounded-lg">
        <summary className="px-4 py-3 cursor-pointer hover:bg-gray-50 text-sm font-medium text-gray-700">
          {t("automation.history.rawData")}
        </summary>
        <div className="border-t border-gray-200 p-4">
          <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-auto max-h-96">
            {JSON.stringify(execution, null, 2)}
          </pre>
        </div>
      </details>

      {/* Actions */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button onClick={onClose} className="btn btn-primary">
          {t("common.close")}
        </button>
      </div>
    </div>
  );
};

export default AutomationHistory;
