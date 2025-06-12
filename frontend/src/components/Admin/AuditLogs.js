import React, { useState } from "react";
import { useQuery } from "react-query";
import { useTranslation } from "react-i18next";
import { adminService } from "../../services/adminService";
import {
  EyeIcon,
  CalendarIcon,
  UserIcon,
  CogIcon,
} from "@heroicons/react/24/outline";

const AuditLogs = () => {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({});
  const [selectedLog, setSelectedLog] = useState(null);

  const { data: auditData, isLoading } = useQuery(
    ["audit-logs", page, filters],
    () => adminService.getAuditLogs({ page, limit: 50, ...filters }),
    { keepPreviousData: true }
  );

  const actionTypes = [
    "create",
    "update",
    "delete",
    "login",
    "logout",
    "workflow_started",
    "workflow_completed",
    "task_completed",
  ];

  const resourceTypes = ["user", "workflow", "task", "form", "webhook", "file"];

  const getActionIcon = (action) => {
    switch (action) {
      case "login":
      case "logout":
        return <UserIcon className="h-4 w-4 text-blue-500" />;
      case "create":
        return (
          <svg
            className="h-4 w-4 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
        );
      case "update":
        return (
          <svg
            className="h-4 w-4 text-yellow-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        );
      case "delete":
        return (
          <svg
            className="h-4 w-4 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        );
      default:
        return <CogIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case "create":
        return "text-green-800 bg-green-100";
      case "update":
        return "text-yellow-800 bg-yellow-100";
      case "delete":
        return "text-red-800 bg-red-100";
      case "login":
        return "text-blue-800 bg-blue-100";
      case "logout":
        return "text-gray-800 bg-gray-100";
      default:
        return "text-indigo-800 bg-indigo-100";
    }
  };

  const LogDetailModal = ({ log, onClose }) => {
    if (!log) return null;

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              {t("admin.audit.logDetail")}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">
                {t("admin.audit.basicInfo")}
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">
                    {t("admin.audit.action")}:
                  </span>
                  <span className="ml-2">{log.action}</span>
                </div>
                <div>
                  <span className="font-medium">
                    {t("admin.audit.resourceType")}:
                  </span>
                  <span className="ml-2">{log.resource_type}</span>
                </div>
                <div>
                  <span className="font-medium">{t("admin.audit.user")}:</span>
                  <span className="ml-2">{log.username || "System"}</span>
                </div>
                <div>
                  <span className="font-medium">
                    {t("admin.audit.timestamp")}:
                  </span>
                  <span className="ml-2">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="font-medium">
                    {t("admin.audit.ipAddress")}:
                  </span>
                  <span className="ml-2">{log.ip_address || "N/A"}</span>
                </div>
                <div>
                  <span className="font-medium">
                    {t("admin.audit.resourceId")}:
                  </span>
                  <span className="ml-2">{log.resource_id || "N/A"}</span>
                </div>
              </div>
            </div>

            {log.old_values && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  {t("admin.audit.oldValues")}
                </h4>
                <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm max-h-64">
                  {JSON.stringify(log.old_values, null, 2)}
                </pre>
              </div>
            )}

            {log.new_values && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  {t("admin.audit.newValues")}
                </h4>
                <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm max-h-64">
                  {JSON.stringify(log.new_values, null, 2)}
                </pre>
              </div>
            )}

            {log.user_agent && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  {t("admin.audit.userAgent")}
                </h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  {log.user_agent}
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              {t("common.close")}
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t("admin.audit.title")}
        </h1>
        <p className="text-gray-600">{t("admin.audit.subtitle")}</p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("admin.audit.action")}
            </label>
            <select
              value={filters.action || ""}
              onChange={(e) =>
                setFilters({ ...filters, action: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{t("common.all")}</option>
              {actionTypes.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("admin.audit.resourceType")}
            </label>
            <select
              value={filters.resource_type || ""}
              onChange={(e) =>
                setFilters({ ...filters, resource_type: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{t("common.all")}</option>
              {resourceTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("admin.audit.dateFrom")}
            </label>
            <input
              type="date"
              value={filters.date_from || ""}
              onChange={(e) =>
                setFilters({ ...filters, date_from: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("admin.audit.dateTo")}
            </label>
            <input
              type="date"
              value={filters.date_to || ""}
              onChange={(e) =>
                setFilters({ ...filters, date_to: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("admin.audit.action")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("admin.audit.resource")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("admin.audit.user")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("admin.audit.timestamp")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("admin.audit.ipAddress")}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("common.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {auditData?.logs?.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {getActionIcon(log.action)}
                    <span
                      className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getActionColor(
                        log.action
                      )}`}
                    >
                      {log.action}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {log.resource_type}
                  </div>
                  {log.resource_id && (
                    <div className="text-sm text-gray-500 truncate max-w-32">
                      {log.resource_id}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {log.username || "System"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(log.created_at).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {log.ip_address || "N/A"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => setSelectedLog(log)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Log Detail Modal */}
      <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
};

export default AuditLogs;
