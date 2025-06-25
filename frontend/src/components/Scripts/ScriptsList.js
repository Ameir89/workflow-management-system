import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { scriptsService } from "../../services/scriptsService";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  DocumentDuplicateIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CodeBracketIcon,
} from "@heroicons/react/24/outline";

const ScriptsList = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    category: "",
    language: "",
    status: "",
  });

  // Fetch scripts
  const {
    data: scriptsData,
    isLoading,
    error,
  } = useQuery(
    ["scripts", page, search, filters],
    () => scriptsService.getScripts({ page, limit: 20, search, ...filters }),
    { keepPreviousData: true }
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
        toast.success("Script deleted successfully");
        queryClient.invalidateQueries(["scripts"]);
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
        toast.success("Script duplicated successfully");
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
        toast.success("Script executed successfully");
        console.log("Test result:", result);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );

  const handleDeleteScript = (script) => {
    if (window.confirm(`Are you sure you want to delete "${script.name}"?`)) {
      deleteScriptMutation.mutate(script.id);
    }
  };

  const handleDuplicateScript = (script) => {
    const newName = prompt(
      "Enter name for duplicated script:",
      `${script.name} (Copy)`
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
        <p className="text-red-600">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Scripts Management
          </h1>
          <p className="text-gray-600">
            Create and manage reusable scripts for workflows
          </p>
        </div>
        <Link
          to="/scripts/create"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Script
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search scripts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={filters.category}
            onChange={(e) =>
              setFilters({ ...filters, category: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Categories</option>
            {categories?.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>

          <select
            value={filters.language}
            onChange={(e) =>
              setFilters({ ...filters, language: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Languages</option>
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="sql">SQL</option>
            <option value="shell">Shell</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Scripts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {scriptsData?.scripts?.map((script) => (
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
                    {script.description || "No description provided"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getLanguageColor(
                    script.language
                  )}`}
                >
                  {script.language}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getCategoryColor(
                    script.category
                  )}`}
                >
                  {script.category}
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
                    {script.status}
                  </span>
                )}
              </div>

              <div className="text-xs text-gray-400 mb-4">
                Created by {script.created_by_name} on{" "}
                {new Date(script.created_at).toLocaleDateString()}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => testScriptMutation.mutate(script.id)}
                    disabled={testScriptMutation.isLoading}
                    className="text-green-400 hover:text-green-600"
                    title="Test script"
                  >
                    <PlayIcon className="h-5 w-5" />
                  </button>

                  <Link
                    to={`/scripts/${script.id}/edit`}
                    className="text-indigo-400 hover:text-indigo-600"
                    title="Edit script"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </Link>

                  <button
                    onClick={() => handleDuplicateScript(script)}
                    className="text-blue-400 hover:text-blue-600"
                    title="Duplicate script"
                  >
                    <DocumentDuplicateIcon className="h-5 w-5" />
                  </button>

                  <button
                    onClick={() => handleDeleteScript(script)}
                    className="text-red-400 hover:text-red-600"
                    title="Delete script"
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
      {scriptsData?.scripts?.length === 0 && (
        <div className="text-center py-12">
          <CodeBracketIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No scripts found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {search || filters.category || filters.language
              ? "No scripts match your current filters."
              : "Get started by creating your first script."}
          </p>
          <div className="mt-6">
            <Link
              to="/scripts/create"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Your First Script
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScriptsList;
