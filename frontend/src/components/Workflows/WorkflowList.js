// src/components/Workflows/WorkflowList.js - Management Focused
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { workflowService } from "../../services/workflowService";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CogIcon,
  ClipboardDocumentListIcon,
  RocketLaunchIcon,
  DocumentDuplicateIcon,
  ArchiveBoxIcon,
  PowerIcon,
} from "@heroicons/react/24/outline";

const WorkflowList = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    status: "",
    category: "",
  });

  const { data: workflowsData, isLoading } = useQuery(
    ["workflows", page, search, filters],
    () => workflowService.getWorkflows({ page, limit: 20, search, ...filters }),
    { keepPreviousData: true }
  );

  const deleteWorkflowMutation = useMutation(
    (id) => workflowService.deleteWorkflow(id),
    {
      onSuccess: () => {
        toast.success("Workflow deleted successfully");
        queryClient.invalidateQueries(["workflows"]);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );

  const toggleWorkflowMutation = useMutation(
    ({ id, action }) => {
      return action === "activate"
        ? workflowService.activateWorkflow(id)
        : workflowService.deactivateWorkflow(id);
    },
    {
      onSuccess: (data, variables) => {
        toast.success(`Workflow ${variables.action}d successfully`);
        queryClient.invalidateQueries(["workflows"]);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );

  const duplicateWorkflowMutation = useMutation(
    (workflow) =>
      workflowService.createWorkflow({
        ...workflow,
        name: `${workflow.name} (Copy)`,
        is_active: false,
      }),
    {
      onSuccess: () => {
        toast.success("Workflow duplicated successfully");
        queryClient.invalidateQueries(["workflows"]);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );

  const handleDeleteWorkflow = (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteWorkflowMutation.mutate(id);
    }
  };

  const handleToggleWorkflow = (id, isActive) => {
    const action = isActive ? "deactivate" : "activate";
    const confirmMessage = isActive
      ? "Are you sure you want to deactivate this workflow? Running instances will continue but no new instances can be started."
      : "Are you sure you want to activate this workflow?";

    if (window.confirm(confirmMessage)) {
      toggleWorkflowMutation.mutate({ id, action });
    }
  };

  const handleDuplicateWorkflow = (workflow) => {
    duplicateWorkflowMutation.mutate(workflow);
  };

  const getStatusColor = (workflow) => {
    if (!workflow.is_active) return "bg-gray-100 text-gray-800";
    if (workflow.instance_count > 0) return "bg-green-100 text-green-800";
    return "bg-blue-100 text-blue-800";
  };

  const getStatusText = (workflow) => {
    if (!workflow.is_active) return "Inactive";
    if (workflow.instance_count > 0) return "Active - Running";
    return "Active - Ready";
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
            Workflow Management
          </h1>
          <p className="text-gray-600">
            Create, configure, and manage your workflow definitions
          </p>
        </div>
        <div className="flex space-x-3">
          <Link
            to="/workflows/instances"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <EyeIcon className="h-4 w-4 mr-2" />
            View All Instances
          </Link>
          <Link
            to="/workflows/designer"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create New Workflow
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Search workflows..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <select
              value={filters.category}
              onChange={(e) =>
                setFilters({ ...filters, category: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Categories</option>
              <option value="approval">Approval</option>
              <option value="automation">Automation</option>
              <option value="notification">Notification</option>
              <option value="integration">Integration</option>
            </select>
          </div>
        </div>
      </div>

      {/* Workflows Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {workflowsData?.workflows?.map((workflow) => (
          <div
            key={workflow.id}
            className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {workflow.name}
                    </h3>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        workflow
                      )}`}
                    >
                      {getStatusText(workflow)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {workflow.description || "No description provided"}
                  </p>
                </div>
              </div>

              {/* Metadata */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center text-sm text-gray-500">
                  <CogIcon className="h-4 w-4 mr-2" />
                  <span>{workflow.definition?.steps?.length || 0} steps</span>
                  <span className="mx-2">•</span>
                  <span>v{workflow.version}</span>
                </div>

                <div className="flex items-center text-sm text-gray-500">
                  <ClipboardDocumentListIcon className="h-4 w-4 mr-2" />
                  <span>{workflow.instance_count || 0} instances</span>
                  {workflow.category && (
                    <>
                      <span className="mx-2">•</span>
                      <span className="capitalize">{workflow.category}</span>
                    </>
                  )}
                </div>

                <div className="text-xs text-gray-400">
                  Created by {workflow.created_by_name} on{" "}
                  {new Date(workflow.created_at).toLocaleDateString()}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex items-center justify-between">
                {/* Primary Action - Start Workflow */}
                <Link
                  to={`/workflows/${workflow.id}/start`}
                  className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    workflow.is_active
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                  onClick={(e) => {
                    if (!workflow.is_active) {
                      e.preventDefault();
                      toast.warning(
                        "Workflow must be active to start instances"
                      );
                    }
                  }}
                >
                  <RocketLaunchIcon className="h-4 w-4 mr-2" />
                  Start Instance
                </Link>

                {/* Secondary Actions */}
                <div className="flex items-center space-x-2">
                  {/* View Instances */}
                  <Link
                    to={`/workflows/${workflow.id}/instances`}
                    className="text-gray-400 hover:text-gray-600"
                    title="View instances"
                  >
                    <EyeIcon className="h-5 w-5" />
                  </Link>

                  {/* Edit */}
                  <Link
                    to={`/workflows/designer/${workflow.id}`}
                    className="text-indigo-400 hover:text-indigo-600"
                    title="Edit workflow"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </Link>

                  {/* Toggle Active/Inactive */}
                  <button
                    onClick={() =>
                      handleToggleWorkflow(workflow.id, workflow.is_active)
                    }
                    className={`${
                      workflow.is_active
                        ? "text-orange-400 hover:text-orange-600"
                        : "text-green-400 hover:text-green-600"
                    }`}
                    title={
                      workflow.is_active
                        ? "Deactivate workflow"
                        : "Activate workflow"
                    }
                  >
                    <PowerIcon className="h-5 w-5" />
                  </button>

                  {/* Duplicate */}
                  <button
                    onClick={() => handleDuplicateWorkflow(workflow)}
                    className="text-blue-400 hover:text-blue-600"
                    title="Duplicate workflow"
                  >
                    <DocumentDuplicateIcon className="h-5 w-5" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() =>
                      handleDeleteWorkflow(workflow.id, workflow.name)
                    }
                    className="text-red-400 hover:text-red-600"
                    title="Delete workflow"
                    disabled={workflow.instance_count > 0}
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Warning for inactive workflows */}
              {!workflow.is_active && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex">
                    <ArchiveBoxIcon className="h-5 w-5 text-yellow-400 mr-2" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">Workflow Inactive</p>
                      <p>
                        This workflow cannot start new instances until
                        activated.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Active instances indicator */}
              {workflow.instance_count > 0 && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center">
                    <ClipboardDocumentListIcon className="h-5 w-5 text-blue-400 mr-2" />
                    <div className="text-sm text-blue-800">
                      <span className="font-medium">
                        {workflow.instance_count}
                      </span>{" "}
                      active instance(s)
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {workflowsData?.workflows?.length === 0 && (
        <div className="text-center py-12">
          <CogIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No workflows found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {search || filters.status || filters.category
              ? "No workflows match your current filters."
              : "Get started by creating your first workflow."}
          </p>
          <div className="mt-6">
            {!(search || filters.status || filters.category) && (
              <Link
                to="/workflows/designer"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Your First Workflow
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Pagination */}
      {workflowsData?.pagination && workflowsData.pagination.pages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg">
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
                setPage(Math.min(workflowsData.pagination.pages, page + 1))
              }
              disabled={page === workflowsData.pagination.pages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing {(page - 1) * 20 + 1} to{" "}
                {Math.min(page * 20, workflowsData.pagination.total)} of{" "}
                {workflowsData.pagination.total} results
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
                    setPage(Math.min(workflowsData.pagination.pages, page + 1))
                  }
                  disabled={page === workflowsData.pagination.pages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats Footer */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {workflowsData?.summary?.total || 0}
            </div>
            <div className="text-sm text-gray-500">Total Workflows</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {workflowsData?.summary?.active || 0}
            </div>
            <div className="text-sm text-gray-500">Active</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {workflowsData?.summary?.running_instances || 0}
            </div>
            <div className="text-sm text-gray-500">Running Instances</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-600">
              {workflowsData?.summary?.completed_today || 0}
            </div>
            <div className="text-sm text-gray-500">Completed Today</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowList;
