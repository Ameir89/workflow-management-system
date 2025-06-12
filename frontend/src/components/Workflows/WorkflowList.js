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
  PlayIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";

const WorkflowList = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data: workflowsData, isLoading } = useQuery(
    ["workflows", page, search],
    () => workflowService.getWorkflows({ page, limit: 20, search }),
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

  const executeWorkflowMutation = useMutation(
    ({ id, data }) => workflowService.executeWorkflow(id, data),
    {
      onSuccess: () => {
        toast.success("Workflow executed successfully");
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

  const handleExecuteWorkflow = (id) => {
    executeWorkflowMutation.mutate({ id, data: {} });
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
            {t("workflows.title")}
          </h1>
          <p className="text-gray-600">{t("workflows.subtitle")}</p>
        </div>
        <Link
          to="/workflows/designer"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Create New Workflow
        </Link>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow">
        <input
          type="text"
          placeholder="Search workflows..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Workflows List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {workflowsData?.workflows?.map((workflow) => (
            <li key={workflow.id}>
              <div className="px-4 py-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-indigo-600 truncate">
                        {workflow.name}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {workflow.description}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          workflow.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {workflow.is_active ? "Active" : "Inactive"}
                      </span>
                      <span className="text-sm text-gray-500">
                        v{workflow.version}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <span>{workflow.instance_count || 0} instances</span>
                    <span className="mx-2">•</span>
                    <span>Created by {workflow.created_by_name}</span>
                    <span className="mx-2">•</span>
                    <span>
                      {new Date(workflow.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleExecuteWorkflow(workflow.id)}
                    className="text-green-400 hover:text-green-500"
                    title="Execute"
                  >
                    <PlayIcon className="h-5 w-5" />
                  </button>
                  <Link
                    to={`/workflows/${workflow.id}/instances`}
                    className="text-gray-400 hover:text-gray-500"
                    title="View Instances"
                  >
                    <EyeIcon className="h-5 w-5" />
                  </Link>
                  <Link
                    to={`/workflows/designer/${workflow.id}`}
                    className="text-indigo-400 hover:text-indigo-500"
                    title="Edit"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </Link>
                  <button
                    onClick={() =>
                      handleDeleteWorkflow(workflow.id, workflow.name)
                    }
                    className="text-red-400 hover:text-red-500"
                    title="Delete"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default WorkflowList;
