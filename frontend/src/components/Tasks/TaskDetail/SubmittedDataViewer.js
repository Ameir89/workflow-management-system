import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CalendarIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import DynamicForm from "../../Forms/DynamicForm";

const SubmittedDataViewer = ({ task, form, className = "" }) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(true);
  const [viewMode, setViewMode] = useState("form"); // 'form' or 'raw'

  // Look for submitted data in multiple possible locations
  const submittedData =
    task.workflow_data?.form_data ||
    task.form_data ||
    task.submitted_data ||
    task.result ||
    task.workflow_data?.data ||
    task.workflow_data;

  if (!submittedData) {
    return null;
  }

  const formatValue = (value) => {
    if (value === null || value === undefined) return t("common.notProvided");
    if (typeof value === "boolean")
      return value ? t("common.yes") : t("common.no");
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    if (Array.isArray(value)) return value.join(", ");
    return String(value);
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
            </div>
          )}
        </div>

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
          {viewMode === "form" ? renderFormView() : renderRawView()}
        </div>
      )}
    </div>
  );
};

export default SubmittedDataViewer;
