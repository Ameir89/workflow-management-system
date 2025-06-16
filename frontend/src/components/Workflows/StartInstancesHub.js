// src/components/Workflows/StartInstancesHub.js
import React, { useState } from "react";
import { useQuery } from "react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { workflowService } from "../../services/workflowService";
import { workflowExecutionService } from "../../services/workflowExecutionService";
import {
  RocketLaunchIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  UserGroupIcon,
  ChartBarIcon,
  FunnelIcon,
  StarIcon,
  BoltIcon,
  DocumentTextIcon,
  CalendarIcon,
  PlayIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";

const StartInstancesHub = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Fetch active workflows
  const { data: workflowsData, isLoading } = useQuery(
    ["active-workflows", search, categoryFilter],
    () =>
      workflowService.getWorkflows({
        is_active: true,
        search,
        category: categoryFilter,
        limit: 50,
      }),
    { keepPreviousData: true }
  );

  // Fetch recent workflows
  const { data: recentWorkflows } = useQuery(["recent-workflows"], () =>
    workflowService.getRecentWorkflows(5)
  );

  // Fetch favorite workflows
  const { data: favoriteWorkflows } = useQuery(["favorite-workflows"], () =>
    workflowService.getFavoriteWorkflows()
  );

  // Fetch workflow templates
  const { data: templates } = useQuery(["workflow-templates"], () =>
    workflowService.getWorkflowTemplates({ limit: 10 })
  );

  // Get workflow categories
  const categories = [
    { value: "", label: "All Categories" },
    { value: "approval", label: "Approval Workflows" },
    { value: "automation", label: "Automation" },
    { value: "notification", label: "Notifications" },
    { value: "integration", label: "Integrations" },
    { value: "finance", label: "Finance" },
    { value: "hr", label: "Human Resources" },
    { value: "operations", label: "Operations" },
  ];

  const getWorkflowIcon = (category) => {
    const iconMap = {
      approval: ClockIcon,
      automation: BoltIcon,
      notification: DocumentTextIcon,
      integration: ChartBarIcon,
      finance: ChartBarIcon,
      hr: UserGroupIcon,
      operations: ChartBarIcon,
    };
    return iconMap[category] || RocketLaunchIcon;
  };

  const getWorkflowColor = (category) => {
    const colorMap = {
      approval: "bg-yellow-100 text-yellow-800 border-yellow-200",
      automation: "bg-purple-100 text-purple-800 border-purple-200",
      notification: "bg-blue-100 text-blue-800 border-blue-200",
      integration: "bg-green-100 text-green-800 border-green-200",
      finance: "bg-emerald-100 text-emerald-800 border-emerald-200",
      hr: "bg-pink-100 text-pink-800 border-pink-200",
      operations: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return (
      colorMap[category] || "bg-indigo-100 text-indigo-800 border-indigo-200"
    );
  };

  const filteredWorkflows =
    workflowsData?.workflows?.filter((workflow) => {
      if (showFavoritesOnly) {
        return favoriteWorkflows?.workflows?.some(
          (fav) => fav.id === workflow.id
        );
      }
      return true;
    }) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto h-16 w-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
          <RocketLaunchIcon className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">
          Start Workflow Instances
        </h1>
        <p className="text-lg text-gray-600 mt-2">
          Choose a workflow to start a new instance and begin processing
        </p>
      </div>

      {/* Quick Actions */}

      {/* Recent & Favorites */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Workflows */}
        {recentWorkflows?.workflows?.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <ClockIcon className="h-5 w-5 mr-2 text-gray-500" />
              Recently Used
            </h2>
            <div className="space-y-3">
              {recentWorkflows.workflows.map((workflow) => (
                <Link
                  key={workflow.id}
                  to={`/workflows/${workflow.id}/start`}
                  className="flex items-center p-3 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">
                      {workflow.name}
                    </h3>
                    <p className="text-sm text-gray-500 capitalize">
                      {workflow.category}
                    </p>
                  </div>
                  <PlayIcon className="h-5 w-5 text-gray-400" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Favorite Workflows */}
        {favoriteWorkflows?.workflows?.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <StarIconSolid className="h-5 w-5 mr-2 text-yellow-500" />
              Favorites
            </h2>
            <div className="space-y-3">
              {favoriteWorkflows.workflows.map((workflow) => (
                <Link
                  key={workflow.id}
                  to={`/workflows/${workflow.id}/start`}
                  className="flex items-center p-3 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">
                      {workflow.name}
                    </h3>
                    <p className="text-sm text-gray-500 capitalize">
                      {workflow.category}
                    </p>
                  </div>
                  <PlayIcon className="h-5 w-5 text-gray-400" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex-1 max-w-lg">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search workflows..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>

            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`inline-flex items-center px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
                showFavoritesOnly
                  ? "border-yellow-300 bg-yellow-50 text-yellow-700"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <StarIcon className="h-4 w-4 mr-2" />
              Favorites Only
            </button>
          </div>
        </div>
      </div>

      {/* Workflows Grid */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Available Workflows ({filteredWorkflows.length})
        </h2>

        {filteredWorkflows.length === 0 ? (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
            <RocketLaunchIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No workflows found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {showFavoritesOnly
                ? "No favorite workflows match your search."
                : search || categoryFilter
                ? "No workflows match your current filters."
                : "No active workflows are available."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWorkflows.map((workflow) => {
              const IconComponent = getWorkflowIcon(workflow.category);
              const isFavorite = favoriteWorkflows?.workflows?.some(
                (fav) => fav.id === workflow.id
              );

              return (
                <div
                  key={workflow.id}
                  className="bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200 group"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div
                        className={`p-3 rounded-lg border ${getWorkflowColor(
                          workflow.category
                        )}`}
                      >
                        <IconComponent className="h-6 w-6" />
                      </div>
                      {isFavorite && (
                        <StarIconSolid className="h-5 w-5 text-yellow-500" />
                      )}
                    </div>

                    <h3 className="mt-4 text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                      {workflow.name}
                    </h3>

                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                      {workflow.description || "No description provided"}
                    </p>

                    <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                      <span className="capitalize">
                        {workflow.category || "General"}
                      </span>
                      <span>
                        {workflow.definition?.steps?.length || 0} steps
                      </span>
                    </div>

                    <div className="mt-4 flex items-center text-xs text-gray-400">
                      <UserGroupIcon className="h-4 w-4 mr-1" />
                      <span>
                        {workflow.instance_count || 0} active instances
                      </span>
                    </div>
                  </div>

                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                    <Link
                      to={`/workflows/${workflow.id}/start`}
                      className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                    >
                      <RocketLaunchIcon className="h-4 w-4 mr-2" />
                      Start Instance
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Templates Section */}
      {templates?.templates?.length > 0 && (
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <DocumentTextIcon className="h-5 w-5 mr-2 text-gray-500" />
            Quick Start Templates
          </h2>
          <p className="text-gray-600 mb-6">
            Pre-configured workflow templates for common business processes
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.templates.map((template) => (
              <div
                key={template.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors"
              >
                <h3 className="font-medium text-gray-900">{template.name}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {template.description}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Used {template.usage_count || 0} times
                  </span>
                  <button className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                    Use Template
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StartInstancesHub;
