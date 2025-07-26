// src/components/WorkflowDesigner/PropertiesPanel/components/node-types/notification/AvailableVariables.js
import React from "react";
import { useTranslation } from "react-i18next";

const AvailableVariables = () => {
  const { t } = useTranslation();

  const variables = [
    { key: "workflow_name", description: "Name of the workflow" },
    { key: "task_name", description: "Name of the current task" },
    { key: "assignee", description: "Person assigned to the task" },
    { key: "due_date", description: "Task due date" },
    { key: "requester", description: "Person who started the workflow" },
    { key: "status", description: "Current workflow/task status" },
  ];

  return (
    <div className="p-3 bg-blue-50 rounded-md">
      <h5 className="text-sm font-medium text-blue-900 mb-2">
        {t("designer.availableVariables")}
      </h5>
      <div className="space-y-1">
        {variables.map((variable, index) => (
          <div
            key={index}
            className="flex items-center justify-between text-xs"
          >
            <code className="text-blue-700">{`{{${variable.key}}}`}</code>
            <span className="text-blue-600 ml-2">{variable.description}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 text-xs text-blue-700">
        <p>
          Variables will be automatically replaced with actual values when the
          notification is sent.
        </p>
      </div>
    </div>
  );
};

export default AvailableVariables;
