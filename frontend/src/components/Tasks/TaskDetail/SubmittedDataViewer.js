import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CalendarIcon,
  UserIcon,
  InformationCircleIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import DynamicForm from "../../Forms/DynamicForm";
import {
  getSubmittedData,
  getAllDataSources,
  getDataSource,
  formatDisplayValue,
} from "../../../utils/taskDataUtils";

const SubmittedDataViewer = ({ task, form, className = "" }) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(true);
  const [viewMode, setViewMode] = useState("form"); // 'form', 'raw', or 'debug'

  // Use the updated utility function
  const submittedData = getSubmittedData(task);
  const dataSource = getDataSource(task);

  // Get all data sources for debugging
  const allDataSources = getAllDataSources(task);

  if (!submittedData) {
    // Show debug info when no data is found
    return (
      <div
        className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}
      >
        <div className="flex items-center space-x-2 text-yellow-800">
          <InformationCircleIcon className="h-5 w-5" />
          <span className="font-medium">No submitted data found</span>
        </div>
        <div className="mt-2 text-sm text-yellow-700">
          <p>Data source checked: {dataSource}</p>
          <details className="mt-2">
            <summary className="cursor-pointer font-medium">
              Show debug info
            </summary>
            <pre className="mt-2 text-xs bg-yellow-100 p-2 rounded overflow-auto">
              {JSON.stringify(allDataSources, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    );
  }

  const formatValue = (value) => {
    return formatDisplayValue(value);
  };

  const renderFormView = () => {
    if (form && form.schema) {
      return (
        <DynamicForm
          schema={form.schema}
          defaultValues={submittedData}
          readOnly={true}
          showSubmitButton={false}
          className="submitted-data-form"
        />
      );
    }

    // Fallback to simple key-value display
    return (
      <div className="space-y-3">
        {Object.entries(submittedData).map(([key, value]) => (
          <div
            key={key}
            className="grid grid-cols-3 gap-4 py-2 border-b border-gray-100 last:border-b-0"
          >
            <div className="text-sm font-medium text-gray-600 capitalize">
              {key.replace(/_/g, " ")}:
            </div>
            <div className="col-span-2 text-sm text-gray-900">
              {formatValue(value)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderRawView = () => {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded p-3">
        <pre className="text-sm text-gray-800 whitespace-pre-wrap overflow-x-auto">
          {JSON.stringify(submittedData, null, 2)}
        </pre>
      </div>
    );
  };

  const renderDebugView = () => {
    return (
      <div className="space-y-4">
        {/* Data Source Info */}
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            Data Source Information
          </h4>
          <p className="text-sm text-blue-800">
            <strong>Source:</strong> {dataSource}
          </p>
          <p className="text-sm text-blue-800">
            <strong>Data Type:</strong> {typeof submittedData}
            {Array.isArray(submittedData) ? " (array)" : ""}
          </p>
          <p className="text-sm text-blue-800">
            <strong>Keys Count:</strong>{" "}
            {typeof submittedData === "object"
              ? Object.keys(submittedData).length
              : "N/A"}
          </p>
        </div>

        {/* All Available Data Sources */}
        <div className="bg-gray-50 border border-gray-200 rounded p-3">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            All Available Data Sources
          </h4>
          <div className="space-y-2">
            {Object.entries(allDataSources).map(([source, data]) => (
              <div key={source} className="text-xs">
                <strong className={data ? "text-green-700" : "text-gray-500"}>
                  {source}:
                </strong>{" "}
                <span className={data ? "text-green-600" : "text-gray-400"}>
                  {data
                    ? `${typeof data} (${Object.keys(data).length} keys)`
                    : "null"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Raw Data */}
        <div className="bg-gray-50 border border-gray-200 rounded p-3">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Raw Submitted Data
          </h4>
          <pre className="text-xs text-gray-800 whitespace-pre-wrap overflow-x-auto">
            {JSON.stringify(submittedData, null, 2)}
          </pre>
        </div>

        {/* Full Task Object */}
        <details className="bg-red-50 border border-red-200 rounded p-3">
          <summary className="text-sm font-medium text-red-900 cursor-pointer">
            Full Task Object (Advanced Debug)
          </summary>
          <pre className="mt-2 text-xs text-red-800 whitespace-pre-wrap overflow-x-auto max-h-64">
            {JSON.stringify(task, null, 2)}
          </pre>
        </details>
      </div>
    );
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-2 text-sm font-medium text-gray-900 hover:text-gray-700"
          >
            {isExpanded ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}
            <DocumentTextIcon className="h-4 w-4" />
            <span>{t("tasks.submittedData")}</span>
          </button>

          {isExpanded && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode("form")}
                className={`px-2 py-1 text-xs rounded ${
                  viewMode === "form"
                    ? "bg-indigo-100 text-indigo-700"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t("tasks.formView")}
              </button>
              <button
                onClick={() => setViewMode("raw")}
                className={`px-2 py-1 text-xs rounded ${
                  viewMode === "raw"
                    ? "bg-indigo-100 text-indigo-700"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t("tasks.rawView")}
              </button>
              <button
                onClick={() => setViewMode("debug")}
                className={`px-2 py-1 text-xs rounded ${
                  viewMode === "debug"
                    ? "bg-red-100 text-red-700"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                title="Debug view - shows all data sources"
              >
                <EyeIcon className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* Data source indicator */}
        {isExpanded && (
          <div className="mt-2 text-xs text-gray-500">
            <span>
              Data source:{" "}
              <code className="bg-gray-100 px-1 rounded">{dataSource}</code>
            </span>
          </div>
        )}

        {/* Submission metadata */}
        {isExpanded && (
          <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
            {(task.submitted_at ||
              task.workflow_data?.submitted_at ||
              task.created_at) && (
              <div className="flex items-center space-x-1">
                <CalendarIcon className="h-3 w-3" />
                <span>
                  {t("tasks.submittedAt")}:{" "}
                  {new Date(
                    task.submitted_at ||
                      task.workflow_data?.submitted_at ||
                      task.created_at
                  ).toLocaleString()}
                </span>
              </div>
            )}
            {(task.submitted_by_name ||
              task.workflow_data?.submitted_by ||
              task.created_by_name) && (
              <div className="flex items-center space-x-1">
                <UserIcon className="h-3 w-3" />
                <span>
                  {t("tasks.submittedBy")}:{" "}
                  {task.submitted_by_name ||
                    task.workflow_data?.submitted_by ||
                    task.created_by_name ||
                    "Unknown"}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4">
          {viewMode === "form" && renderFormView()}
          {viewMode === "raw" && renderRawView()}
          {viewMode === "debug" && renderDebugView()}
        </div>
      )}
    </div>
  );
};

export default SubmittedDataViewer;
