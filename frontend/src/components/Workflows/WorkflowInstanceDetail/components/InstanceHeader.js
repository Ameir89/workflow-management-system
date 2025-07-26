// src/components/Workflows/WorkflowInstanceDetail/components/InstanceHeader.js
import React from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeftIcon,
  ClockIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import StatusBadge from "./StatusBadge";
import { PriorityBadge } from "./PriorityBadge";
import ApprovalBadge from "./ApprovalBadge";

const InstanceHeader = ({
  instanceData,
  getDuration,
  getProgress,
  onNavigateBack,
  actionsComponent,
}) => {
  const { t } = useTranslation();

  return (
    <>
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onNavigateBack}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          {t("workflows.backToInstances")}
        </button>

        {/* Actions Component */}
        {actionsComponent}
      </div>

      {/* Instance Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {instanceData.title ||
                  t("workflows.instanceWithId", { id: instanceData.id })}
              </h1>
              <StatusBadge status={instanceData.status} size="lg" />
              {instanceData.priority && (
                <PriorityBadge priority={instanceData.priority} />
              )}
            </div>

            <h2 className="text-lg text-gray-600 mb-4">
              {instanceData.workflow_name}
            </h2>

            {instanceData.description && (
              <p className="text-gray-700 mb-4">{instanceData.description}</p>
            )}

            {/* Approval Status Section */}
            {(instanceData.data?.approval_status ||
              instanceData.data?.approval_decision) && (
              <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  {t("workflows.approvalStatus")}
                </h4>
                <ApprovalBadge instanceData={instanceData} size="md" />
              </div>
            )}

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <ClockIcon className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-blue-900">
                    {t("workflows.duration")}
                  </span>
                </div>
                <p className="text-xl font-semibold text-blue-900 mt-1">
                  {getDuration()}
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <ChartBarIcon className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-green-900">
                    {t("workflows.progress")}
                  </span>
                </div>
                <p className="text-xl font-semibold text-green-900 mt-1">
                  {getProgress()}%
                </p>
                {instanceData.total_steps > 0 && (
                  <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${getProgress()}%` }}
                    ></div>
                  </div>
                )}
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center">
                  <ClipboardDocumentListIcon className="h-5 w-5 text-purple-600 mr-2" />
                  <span className="text-sm font-medium text-purple-900">
                    {t("workflows.tasks")}
                  </span>
                </div>
                <p className="text-xl font-semibold text-purple-900 mt-1">
                  {instanceData.completed_steps}/{instanceData.total_steps}
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center">
                  <UserIcon className="h-5 w-5 text-gray-600 mr-2" />
                  <span className="text-sm font-medium text-gray-900">
                    {t("workflows.startedBy")}
                  </span>
                </div>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {instanceData.started_by_name || t("workflows.system")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default InstanceHeader;
