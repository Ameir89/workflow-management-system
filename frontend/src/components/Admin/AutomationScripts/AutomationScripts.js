// src/pages/AutomationScripts/AutomationScripts.js
import React, { useState } from "react";
import { useQuery } from "react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  PlusIcon,
  CodeBracketIcon,
  PlayIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  EyeIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import LoadingSpinner from "../../Common/LoadingSpinner";
import SearchAndSort from "../../Common/SearchAndSort";
import Pagination from "../../Common/Pagination";
import StatusBadge from "../../Common/StatusBadge";
import EmptyState from "../../Common/EmptyState";
import ConfirmDialog from "../../Common/ConfirmDialog";
import { scriptsService } from "../../../services/scriptsService";

const AutomationScripts = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // State management
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("updated_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [filters, setFilters] = useState({});
  const [selectedScripts, setSelectedScripts] = useState([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [scriptToDelete, setScriptToDelete] = useState(null);

  // Fetch scripts
  const {
    data: scriptsData,
    isLoading,
    error,
    refetch,
  } = useQuery(
    [
      "automation-scripts",
      currentPage,
      search,
      sortField,
      sortDirection,
      filters,
    ],
    () =>
      scriptsService.getScripts({
        page: currentPage,
        limit: 20,
        search,
        sort_field: sortField,
        sort_direction: sortDirection,
        ...filters,
      }),
    {
      keepPreviousData: true,
      staleTime: 30000,
    }
  );

  const scripts = scriptsData?.scripts || [];
  const pagination = scriptsData?.pagination || {};

  // Filter options
  const filterOptions = {
    script_type: [
      { value: "", label: t("automation.filters.allTypes") },
      { value: "javascript", label: t("automation.languages.javascript") },
      { value: "python", label: t("automation.languages.python") },
      { value: "json", label: t("automation.languages.json") },
    ],
    category: [
      { value: "", label: t("automation.filters.allCategories") },
      { value: "api_call", label: t("automation.categories.apiCall") },
      {
        value: "data_processing",
        label: t("automation.categories.dataProcessing"),
      },
      { value: "notification", label: t("automation.categories.notification") },
      { value: "integration", label: t("automation.categories.integration") },
      { value: "utility", label: t("automation.categories.utility") },
    ],
    is_active: [
      { value: "", label: t("automation.filters.allStatuses") },
      { value: "true", label: t("automation.filters.active") },
      { value: "false", label: t("automation.filters.inactive") },
    ],
  };

  // Sort options
  const sortOptions = [
    { value: "name", label: t("common.name") },
    { value: "created_at", label: t("common.dateCreated") },
    { value: "updated_at", label: t("common.dateModified") },
    { value: "execution_count", label: t("automation.executionCount") },
  ];

  // Handle sort change
  const handleSortChange = (field, direction) => {
    setSortField(field);
    setSortDirection(direction);
    setCurrentPage(1);
  };

  // Handle script actions
  const handleEdit = (script) => {
    navigate(`/automation/scripts/${script.id}/edit`);
  };

  const handleView = (script) => {
    navigate(`/automation/scripts/${script.id}`);
  };

  const handleTest = async (script) => {
    try {
      const result = await scriptsService.testScript(script.id, {});
      toast.success(t("automation.testExecuted"));
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDuplicate = async (script) => {
    try {
      const newName = `${script.name} (Copy)`;
      const result = await scriptsService.duplicateScript(script.id, newName);
      toast.success(t("automation.scriptDuplicated"));
      refetch();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDeleteClick = (script) => {
    setScriptToDelete(script);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!scriptToDelete) return;

    try {
      await scriptsService.deleteScript(scriptToDelete.id);
      toast.success(t("automation.scriptDeleted"));
      setShowDeleteDialog(false);
      setScriptToDelete(null);
      refetch();
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Handle selection
  const handleSelectScript = (scriptId, checked) => {
    if (checked) {
      setSelectedScripts((prev) => [...prev, scriptId]);
    } else {
      setSelectedScripts((prev) => prev.filter((id) => id !== scriptId));
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedScripts(scripts.map((script) => script.id));
    } else {
      setSelectedScripts([]);
    }
  };

  // Format execution stats
  const formatExecutionStats = (script) => {
    const { execution_count = 0, successful_executions = 0 } = script;
    if (execution_count === 0) return t("automation.noExecutions");

    const successRate = Math.round(
      (successful_executions / execution_count) * 100
    );
    return t("automation.executionStats", {
      total: execution_count,
      success: successful_executions,
      rate: successRate,
    });
  };

  // Get script type badge variant
  const getScriptTypeBadge = (scriptType) => {
    const typeMap = {
      javascript: { variant: "info", label: "JS" },
      python: { variant: "success", label: "PY" },
      json: { variant: "default", label: "JSON" },
    };
    return (
      typeMap[scriptType] || {
        variant: "default",
        label: scriptType?.toUpperCase(),
      }
    );
  };

  if (isLoading && !scriptsData) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text={t("automation.loading")} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <XCircleIcon className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {t("automation.loadError")}
        </h3>
        <p className="text-gray-500 mb-4">{error.message}</p>
        <button onClick={refetch} className="btn btn-primary">
          {t("common.retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t("automation.scripts")}
          </h1>
          <p className="text-gray-600 mt-1">
            {t("automation.scriptsDescription")}
          </p>
        </div>
        <button
          onClick={() => navigate("/automation/scripts/create")}
          className="btn btn-primary"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          {t("automation.createScript")}
        </button>
      </div>

      {/* Search and Filters */}
      <SearchAndSort
        search={search}
        onSearchChange={setSearch}
        sortField={sortField}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        filters={filters}
        onFiltersChange={setFilters}
        filterOptions={filterOptions}
        sortOptions={sortOptions}
        placeholder={t("automation.searchPlaceholder")}
      />

      {/* Bulk Actions */}
      {selectedScripts.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-blue-500 mr-2" />
              <span className="text-sm font-medium text-blue-900">
                {t("automation.selectedCount", {
                  count: selectedScripts.length,
                })}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  // Bulk test functionality
                  toast.info(t("automation.bulkTestNotImplemented"));
                }}
                className="btn btn-outline btn-sm"
              >
                <PlayIcon className="h-4 w-4 mr-1" />
                {t("automation.testSelected")}
              </button>
              <button
                onClick={() => {
                  // Bulk delete functionality
                  toast.info(t("automation.bulkDeleteNotImplemented"));
                }}
                className="btn btn-outline btn-sm text-red-600 border-red-300 hover:bg-red-50"
              >
                <TrashIcon className="h-4 w-4 mr-1" />
                {t("automation.deleteSelected")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scripts Table */}
      {scripts.length === 0 ? (
        <EmptyState
          title={t("automation.noScripts")}
          description={t("automation.noScriptsDescription")}
          icon={CodeBracketIcon}
          action={{
            label: t("automation.createFirstScript"),
            onClick: () => navigate("/automation/scripts/create"),
            icon: PlusIcon,
          }}
        />
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={
                      scripts.length > 0 &&
                      selectedScripts.length === scripts.length
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("automation.name")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("automation.type")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("automation.category")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("automation.status")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("automation.executions")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("automation.lastModified")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("common.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {scripts.map((script) => {
                const typeBadge = getScriptTypeBadge(script.script_type);
                const isSelected = selectedScripts.includes(script.id);

                return (
                  <tr
                    key={script.id}
                    className={`hover:bg-gray-50 ${
                      isSelected ? "bg-blue-50" : ""
                    }`}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) =>
                          handleSelectScript(script.id, e.target.checked)
                        }
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {script.name}
                        </div>
                        {script.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {script.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge
                        status={typeBadge.label}
                        variant={typeBadge.variant}
                        size="sm"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">
                        {script.category || t("automation.uncategorized")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge
                        status={
                          script.is_active
                            ? t("automation.active")
                            : t("automation.inactive")
                        }
                        variant={script.is_active ? "success" : "default"}
                        size="sm"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {formatExecutionStats(script)}
                      </div>
                      {script.last_executed && (
                        <div className="text-xs text-gray-500">
                          {t("automation.lastRun")}:{" "}
                          {new Date(script.last_executed).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {new Date(script.updated_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {t("automation.by")} {script.created_by_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleView(script)}
                          className="text-gray-400 hover:text-gray-600"
                          title={t("automation.view")}
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(script)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title={t("automation.edit")}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleTest(script)}
                          className="text-green-600 hover:text-green-900"
                          title={t("automation.test")}
                        >
                          <PlayIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(script)}
                          className="text-blue-600 hover:text-blue-900"
                          title={t("automation.duplicate")}
                        >
                          <DocumentDuplicateIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(script)}
                          className="text-red-600 hover:text-red-900"
                          title={t("automation.delete")}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <Pagination
        pagination={pagination}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
        title={t("automation.deleteScript")}
        message={t("automation.deleteConfirmation", {
          name: scriptToDelete?.name,
        })}
        confirmLabel={t("common.delete")}
        variant="danger"
      />
    </div>
  );
};

export default AutomationScripts;
