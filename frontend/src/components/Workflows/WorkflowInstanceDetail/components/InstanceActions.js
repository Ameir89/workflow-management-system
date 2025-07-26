// src/components/Workflows/WorkflowInstanceDetail/components/InstanceActions.js
import React from "react";
import { useTranslation } from "react-i18next";
import {
  PlayIcon,
  PauseIcon,
  StopIcon,
  DocumentDuplicateIcon,
  ArrowPathIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";

const InstanceActions = ({
  instanceData,
  onAction,
  onRefresh,
  canPerformAction,
  isLoading,
}) => {
  const { t } = useTranslation();

  const actions = [
    {
      id: "pause",
      label: t("workflows.pauseInstance"),
      icon: PauseIcon,
      variant: "warning",
      visible: canPerformAction("pause"),
    },
    {
      id: "resume",
      label: t("workflows.resumeInstance"),
      icon: PlayIcon,
      variant: "success",
      visible: canPerformAction("resume"),
    },
    {
      id: "cancel",
      label: t("workflows.cancelInstance"),
      icon: StopIcon,
      variant: "danger",
      visible: canPerformAction("cancel"),
    },
  ];

  const getButtonStyles = (variant) => {
    const baseStyles =
      "inline-flex items-center px-3 py-2 border text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
      primary:
        "border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:ring-indigo-500",
      success:
        "border-green-300 text-green-700 bg-green-50 hover:bg-green-100 focus:ring-green-500",
      warning:
        "border-yellow-300 text-yellow-700 bg-yellow-50 hover:bg-yellow-100 focus:ring-yellow-500",
      danger:
        "border-red-300 text-red-700 bg-red-50 hover:bg-red-100 focus:ring-red-500",
    };

    return `${baseStyles} ${variants[variant] || variants.primary}`;
  };

  const visibleActions = actions.filter((action) => action.visible);

  if (visibleActions.length === 0) {
    return (
      <div className="flex items-center space-x-2">
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <ArrowPathIcon
            className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
          />
          {t("common.refresh")}
        </button>

        <button
          onClick={() =>
            window.open(`/workflows/${instanceData.workflow_id}`, "_blank")
          }
          className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <EyeIcon className="h-4 w-4 mr-2" />
          {t("workflows.viewWorkflow")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      {visibleActions.map((action) => {
        const IconComponent = action.icon;
        return (
          <button
            key={action.id}
            onClick={() => onAction(action.id)}
            disabled={isLoading}
            className={getButtonStyles(action.variant)}
            title={action.label}
          >
            <IconComponent className="h-4 w-4 mr-2" />
            {action.label}
          </button>
        );
      })}

      <div className="border-l border-gray-300 pl-2 ml-2">
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <ArrowPathIcon
            className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
          />
          {t("common.refresh")}
        </button>

        <button
          onClick={() =>
            window.open(`/workflows/${instanceData.workflow_id}`, "_blank")
          }
          className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ml-2"
        >
          <EyeIcon className="h-4 w-4 mr-2" />
          {t("workflows.viewWorkflow")}
        </button>
      </div>
    </div>
  );
};

export default InstanceActions;
