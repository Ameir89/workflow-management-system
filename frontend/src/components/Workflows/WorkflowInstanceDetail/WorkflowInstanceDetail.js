// src/components/Workflows/WorkflowInstanceDetail/WorkflowInstanceDetail.js - Optimized Version
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import LoadingSpinner from "../../Common/LoadingSpinner";
import useWorkflowInstance from "../../../hooks/useWorkflowInstance";

// Import sub-components
import {
  InstanceHeader,
  InstanceActions,
  InstanceTabs,
  OverviewTab,
  TasksTab,
  TimelineTab,
  DataTab,
} from "./components";

const WorkflowInstanceDetail = () => {
  const { t } = useTranslation();
  const { instanceId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  // Use custom hook for workflow instance management
  const {
    instance,
    tasks,
    isLoading,
    error,
    executeAction,
    canPerformAction,
    refetch,
    getDuration,
    getProgress,
    isAnyActionLoading,
  } = useWorkflowInstance(instanceId, {
    autoRefresh: true,
    refreshInterval: 30000,
    onActionSuccess: (action, data) => {
      // Handle successful actions
      if (action === "clone" && data?.instance_id) {
        navigate(`/workflows/instances/${data.instance_id}`);
      }
    },
    onActionError: (action, error) => {
      // Handle action errors (already handled by the hook with toast)
      console.error(`Action ${action} failed:`, error);
    },
  });

  // Handle actions with appropriate confirmations
  const handleAction = async (action) => {
    let confirmationMessage = null;

    if (action === "cancel") {
      confirmationMessage = t("workflows.confirmCancelInstance");
    }

    const result = await executeAction(action, confirmationMessage);

    // Navigate to new instance if cloning was successful
    if (action === "clone" && result?.instance_id) {
      navigate(`/workflows/instances/${result.instance_id}`);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <LoadingSpinner fullScreen text={t("workflows.loadingInstanceDetails")} />
    );
  }

  // Error state
  if (error || !instance) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
        <h2 className="mt-4 text-lg font-medium text-gray-900">
          {t("workflows.instanceNotFound")}
        </h2>
        <p className="mt-2 text-gray-600">
          {t("workflows.instanceNotFoundDescription")}
        </p>
        <button
          onClick={() => navigate("/workflows/instances")}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          {t("workflows.backToInstances")}
        </button>
      </div>
    );
  }

  // Tab configuration
  const tabs = [
    {
      id: "overview",
      name: t("workflows.tabs.overview"),
      count: null,
    },
    {
      id: "tasks",
      name: t("workflows.tabs.tasks"),
      count: tasks.length,
    },
    {
      id: "timeline",
      name: t("workflows.tabs.timeline"),
      count: null,
    },
    {
      id: "data",
      name: t("workflows.tabs.data"),
      count: null,
    },
  ];

  // Tab content renderer
  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewTab instance={instance} />;
      case "tasks":
        return (
          <TasksTab
            tasks={tasks}
            instanceId={instanceId}
            onTaskUpdate={refetch}
          />
        );
      case "timeline":
        return <TimelineTab instance={instance} tasks={tasks} />;
      case "data":
        return <DataTab instance={instance} />;
      default:
        return <OverviewTab instance={instance} />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-6">
      {/* Header with navigation, actions, and metrics */}
      <InstanceHeader
        instanceData={instance}
        getDuration={getDuration}
        getProgress={getProgress}
        onNavigateBack={() => navigate("/workflows/instances")}
        actionsComponent={
          <InstanceActions
            instanceData={instance}
            onAction={handleAction}
            onRefresh={refetch}
            canPerformAction={canPerformAction}
            isLoading={isAnyActionLoading()}
          />
        }
      />

      {/* Tab Navigation */}
      <InstanceTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Tab Content */}
      <div className="bg-white border border-gray-200 rounded-lg">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default WorkflowInstanceDetail;
