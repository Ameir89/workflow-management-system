import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { scriptsService } from "../../services/scriptsService";
import Pagination from "../Common/Pagination";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  DocumentDuplicateIcon,
  MagnifyingGlassIcon,
  CodeBracketIcon,
} from "@heroicons/react/24/outline";

const ScriptsList = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    category: "",
    language: "",
    status: "",
  });

  const limit = 12; // Number of scripts per page

  // Fetch scripts with pagination
  const { data: scriptsData, isLoading } = useQuery(
    ["scripts", currentPage, search, filters],
    () =>
      scriptsService.getScripts({
        page: currentPage,
        limit,
        search,
        ...filters,
      }),
    {
      keepPreviousData: true,
      staleTime: 30000, // Keep data fresh for 30 seconds
    }
  );

  // Fetch categories for filter
  const { data: categories } = useQuery(
    ["script-categories"],
    scriptsService.getScriptCategories
  );

  // Delete script mutation
  const deleteScriptMutation = useMutation(
    (id) => scriptsService.deleteScript(id),
    {
      onSuccess: () => {
        toast.success(t("scripts.deleteSuccess"));
        queryClient.invalidateQueries(["scripts"]);

        // If we deleted the last item on current page and we're not on page 1,
        // go back to previous page
        if (scriptsData?.scripts?.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );

  // Duplicate script mutation
  const duplicateScriptMutation = useMutation(
    ({ id, name }) => scriptsService.duplicateScript(id, name),
    {
      onSuccess: () => {
        toast.success(t("scripts.duplicateSuccess"));
        queryClient.invalidateQueries(["scripts"]);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );

  // Test script mutation
  const testScriptMutation = useMutation(
    (id) => scriptsService.testScript(id),
    {
      onSuccess: (result) => {
        toast.success(t("scripts.testing.testSuccess"));
        console.log("Test result:", result);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handle search change
  const handleSearchChange = (newSearch) => {
    setSearch(newSearch);
    setCurrentPage(1); // Reset to first page when searching
  };

  // Handle filter change
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleDeleteScript = (script) => {
    if (window.confirm(t("scripts.confirmDelete", { name: script.name }))) {
      deleteScriptMutation.mutate(script.id);
    }
  };

  const handleDuplicateScript = (script) => {
    const newName = prompt(
      t("scripts.duplicatePrompt"),
      t("scripts.duplicateName", { name: script.name })
    );
    if (newName && newName.trim()) {
      duplicateScriptMutation.mutate({ id: script.id, name: newName.trim() });
    }
  };

  const getLanguageColor = (language) => {
    const colors = {
      javascript: "bg-yellow-100 text-yellow-800",
      python: "bg-blue-100 text-blue-800",
      sql: "bg-green-100 text-green-800",
      shell: "bg-gray-100 text-gray-800",
    };
    return colors[language] || "bg-gray-100 text-gray-800";
  };

  const getCategoryColor = (category) => {
    const colors = {
      condition: "bg-purple-100 text-purple-800",
      validation: "bg-indigo-100 text-indigo-800",
      transformation: "bg-green-100 text-green-800",
      utility: "bg-orange-100 text-orange-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  if (isLoading && !scriptsData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const scripts = scriptsData?.scripts || [];
  const pagination = scriptsData?.pagination || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t("scripts.title")}
          </h1>
          <p className="text-gray-600">{t("scripts.subtitle")}</p>
        </div>
        <Link
          to="/scripts/create"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          {t("scripts.createNew")}
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={t("scripts.searchPlaceholder")}
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={filters.category}
            onChange={(e) =>
              handleFilterChange({ ...filters, category: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">{t("scripts.analytics.allCategories")}</option>
            {categories?.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>

          <select
            value={filters.language}
            onChange={(e) =>
              handleFilterChange({ ...filters, language: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">{t("scripts.allLanguages")}</option>
            <option value="javascript">
              {t("scripts.languages.javascript")}
            </option>
            <option value="python">{t("scripts.languages.python")}</option>
            <option value="sql">{t("scripts.languages.sql")}</option>
            <option value="shell">{t("scripts.languages.shell")}</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) =>
              handleFilterChange({ ...filters, status: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">{t("common.allStatus")}</option>
            <option value="active">{t("scripts.statuses.active")}</option>
            <option value="inactive">{t("scripts.statuses.inactive")}</option>
            <option value="draft">{t("scripts.statuses.draft")}</option>
          </select>
        </div>

        {/* Results summary */}
        {pagination.total > 0 && (
          <div className="mt-4 text-sm text-gray-500">
            {t("common.showingResults", {
              from: (currentPage - 1) * limit + 1,
              to: Math.min(currentPage * limit, pagination.total),
              total: pagination.total,
            })}
            {search && ` ${t("scripts.matchingSearch", { search })}`}
          </div>
        )}
      </div>

      {/* Loading overlay for pagination */}
      {isLoading && scriptsData && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">
              {t("scripts.loadingScripts")}
            </p>
          </div>
        </div>
      )}

      {/* Scripts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {scripts.map((script) => (
          <div
            key={script.id}
            className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 truncate">
                    {script.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                    {script.description || t("scripts.noDescriptionProvided")}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getLanguageColor(
                    script.script_type
                  )}`}
                >
                  {t(`scripts.languages.${script.script_type}`)}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getCategoryColor(
                    script.category
                  )}`}
                >
                  {t(`scripts.categories.${script.category}`)}
                </span>
                {script.status && (
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      script.status === "active"
                        ? "bg-green-100 text-green-800"
                        : script.status === "draft"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {t(`scripts.statuses.${script.status}`)}
                  </span>
                )}
              </div>

              <div className="text-xs text-gray-400 mb-4">
                {t("common.createdBy")} {script.created_by_name}{" "}
                {t("common.on")}{" "}
                {new Date(script.created_at).toLocaleDateString()}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => testScriptMutation.mutate(script.id)}
                    disabled={testScriptMutation.isLoading}
                    className="text-green-400 hover:text-green-600 disabled:opacity-50"
                    title={t("scripts.testScript")}
                  >
                    <PlayIcon className="h-5 w-5" />
                  </button>

                  <Link
                    to={`/scripts/${script.id}/edit`}
                    className="text-indigo-400 hover:text-indigo-600"
                    title={t("scripts.common.edit")}
                  >
                    <PencilIcon className="h-5 w-5" />
                  </Link>

                  <button
                    onClick={() => handleDuplicateScript(script)}
                    disabled={duplicateScriptMutation.isLoading}
                    className="text-blue-400 hover:text-blue-600 disabled:opacity-50"
                    title={t("scripts.duplicateScript")}
                  >
                    <DocumentDuplicateIcon className="h-5 w-5" />
                  </button>

                  <button
                    onClick={() => handleDeleteScript(script)}
                    disabled={deleteScriptMutation.isLoading}
                    className="text-red-400 hover:text-red-600 disabled:opacity-50"
                    title={t("scripts.common.delete")}
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {scripts.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <CodeBracketIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {t("scripts.noScripts")}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {search || filters.category || filters.language || filters.status
              ? t("scripts.noScriptsMatchFilters")
              : t("scripts.noScriptsDescription")}
          </p>
          <div className="mt-6">
            <Link
              to="/scripts/create"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              {t("scripts.createFirst")}
            </Link>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="mt-8">
          <Pagination
            pagination={pagination}
            currentPage={currentPage}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
};

export default ScriptsList;
