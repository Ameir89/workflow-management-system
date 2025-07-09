// src/components/Workflows/WorkflowInstanceDetail/components/OverviewTab.js
import React from "react";
import { useTranslation } from "react-i18next";
import { UserIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";

const OverviewTab = ({ instance }) => {
  const { t } = useTranslation();

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Instance Details */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {t("workflows.instanceDetails")}
          </h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">
                {t("workflows.instanceId")}
              </dt>
              <dd className="text-sm text-gray-900 font-mono">{instance.id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                {t("workflows.workflow")}
              </dt>
              <dd className="text-sm text-gray-900">
                {instance.workflow_name}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                {t("common.createdAt")}
              </dt>
              <dd className="text-sm text-gray-900">
                {new Date(instance.created_at).toLocaleString()}
              </dd>
            </div>
            {instance.started_at && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  {t("workflows.started")}
                </dt>
                <dd className="text-sm text-gray-900">
                  {new Date(instance.started_at).toLocaleString()}
                </dd>
              </div>
            )}
            {instance.completed_at && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  {t("workflows.completed")}
                </dt>
                <dd className="text-sm text-gray-900">
                  {new Date(instance.completed_at).toLocaleString()}
                </dd>
              </div>
            )}
            {instance.due_date && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  {t("workflows.dueDate")}
                </dt>
                <dd className="text-sm text-gray-900">
                  {new Date(instance.due_date).toLocaleString()}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Current Status */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {t("workflows.currentStatus")}
          </h3>
          {instance.current_step ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900">
                {t("workflows.currentStep")}: {instance.current_step}
              </h4>
              {instance.current_step.description && (
                <p className="text-sm text-blue-700 mt-1">
                  {instance.current_step.description}
                </p>
              )}
              {instance.current_step.assigned_to && (
                <div className="flex items-center mt-2 text-sm text-blue-700">
                  <UserIcon className="h-4 w-4 mr-1" />
                  {t("workflows.assignedTo")}:{" "}
                  {instance.current_step.assigned_to_name}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-gray-600">{t("workflows.noActiveStep")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
