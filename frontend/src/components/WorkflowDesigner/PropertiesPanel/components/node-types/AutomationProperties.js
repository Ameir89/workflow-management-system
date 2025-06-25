// src/components/WorkflowDesigner/PropertiesPanel/components/node-types/AutomationProperties.js
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CodeBracketIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import FormField from "../../../../../components/Common/FormField";
import FormSelect from "../../../../../components/Common/FormSelect";
import FormTextarea from "../../../../../components/Common/FormTextarea";
import PropertySection from "../PropertySection";

const AutomationProperties = ({ node, onPropertyChange }) => {
  const { t } = useTranslation();
  const properties = node.properties || {};
  const [showExamples, setShowExamples] = useState(false);

  const scriptTypeOptions = [
    { value: "javascript", label: "JavaScript" },
    { value: "webhook", label: "Webhook Call" },
    { value: "email", label: "Email Action" },
    { value: "database", label: "Database Query" },
  ];

  const methodOptions = [
    { value: "GET", label: "GET" },
    { value: "POST", label: "POST" },
    { value: "PUT", label: "PUT" },
    { value: "DELETE", label: "DELETE" },
    { value: "PATCH", label: "PATCH" },
  ];

  const getScriptPlaceholder = () => {
    const scriptType = properties.scriptType || "javascript";
    switch (scriptType) {
      case "javascript":
        return t("designer.javascriptPlaceholder");
      case "webhook":
        return t("designer.webhookPlaceholder");
      case "email":
        return t("designer.emailActionPlaceholder");
      case "database":
        return t("designer.databasePlaceholder");
      default:
        return "// JavaScript code here";
    }
  };

  const renderScriptTypeSpecificFields = () => {
    const scriptType = properties.scriptType || "javascript";

    switch (scriptType) {
      case "webhook":
        return (
          <div className="space-y-4">
            <FormField label={t("designer.webhookUrl")} required>
              <input
                type="url"
                value={properties.webhookUrl || ""}
                onChange={(e) => onPropertyChange("webhookUrl", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="https://api.example.com/webhook"
              />
            </FormField>

            <FormSelect
              label={t("designer.httpMethod")}
              value={properties.method || "POST"}
              onChange={(e) => onPropertyChange("method", e.target.value)}
              options={methodOptions}
            />

            <FormField label={t("designer.requestHeaders")}>
              <FormTextarea
                value={properties.headers || ""}
                onChange={(e) => onPropertyChange("headers", e.target.value)}
                rows={3}
                placeholder='{"Content-Type": "application/json", "Authorization": "Bearer token"}'
              />
            </FormField>
          </div>
        );

      case "email":
        return (
          <div className="space-y-4">
            <FormField label={t("designer.emailRecipients")} required>
              <input
                type="text"
                value={properties.emailRecipients || ""}
                onChange={(e) =>
                  onPropertyChange("emailRecipients", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="user1@example.com, user2@example.com"
              />
            </FormField>

            <FormField label={t("designer.emailSubject")}>
              <input
                type="text"
                value={properties.emailSubject || ""}
                onChange={(e) =>
                  onPropertyChange("emailSubject", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={t("designer.emailSubjectPlaceholder")}
              />
            </FormField>
          </div>
        );

      case "database":
        return (
          <div className="space-y-4">
            <FormField label={t("designer.connectionString")} required>
              <input
                type="text"
                value={properties.connectionString || ""}
                onChange={(e) =>
                  onPropertyChange("connectionString", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="mongodb://localhost:27017/mydb"
              />
            </FormField>
          </div>
        );

      default:
        return null;
    }
  };

  const getCodeExamples = () => {
    const scriptType = properties.scriptType || "javascript";
    const examples = {
      javascript: `// Access workflow data
const workflowData = context.workflow;
const taskData = context.task;

// Perform calculations
const result = workflowData.amount * 0.1;

// Return data to workflow
return {
  success: true,
  calculatedValue: result,
  message: "Calculation completed"
};`,
      webhook: `{
  "workflow_id": "{{workflow.id}}",
  "status": "{{workflow.status}}",
  "data": {
    "assignee": "{{task.assignee}}",
    "completed_at": "{{current_timestamp}}"
  }
}`,
      email: `Subject: Workflow Update - {{workflow.name}}

Dear {{task.assignee}},

Your task "{{task.name}}" in workflow "{{workflow.name}}" requires attention.

Due Date: {{task.due_date}}
Priority: {{task.priority}}

Best regards,
Workflow System`,
      database: `// MongoDB query example
db.tasks.updateOne(
  { workflow_id: "{{workflow.id}}" },
  { 
    $set: { 
      status: "completed",
      completed_at: new Date()
    }
  }
)`,
    };
    return examples[scriptType] || examples.javascript;
  };

  return (
    <PropertySection title={t("designer.automationProperties")}>
      <div className="space-y-4">
        <FormSelect
          label={t("designer.scriptType")}
          value={properties.scriptType || "javascript"}
          onChange={(e) => onPropertyChange("scriptType", e.target.value)}
          options={scriptTypeOptions}
        />

        {renderScriptTypeSpecificFields()}

        <FormField label={t("designer.script")} required>
          <FormTextarea
            value={properties.script || ""}
            onChange={(e) => onPropertyChange("script", e.target.value)}
            rows={10}
            className="font-mono text-sm"
            placeholder={getScriptPlaceholder()}
          />
        </FormField>

        <FormField
          label={t("designer.timeout")}
          help={t("designer.timeoutHelp")}
        >
          <input
            type="number"
            value={properties.timeout || 300}
            onChange={(e) =>
              onPropertyChange("timeout", parseInt(e.target.value) || 300)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            min="1"
            max="3600"
          />
          <div className="mt-1 text-xs text-gray-500">
            {t("designer.timeoutInSeconds")} (1-3600)
          </div>
        </FormField>

        {/* Code Examples Section */}
        <div className="border-t pt-4">
          <button
            type="button"
            onClick={() => setShowExamples(!showExamples)}
            className="flex items-center text-sm text-indigo-600 hover:text-indigo-700"
          >
            <CodeBracketIcon className="h-4 w-4 mr-1" />
            {showExamples
              ? t("designer.hideExamples")
              : t("designer.showExamples")}
          </button>

          {showExamples && (
            <div className="mt-3 p-4 bg-gray-50 rounded-md">
              <h5 className="text-sm font-medium text-gray-900 mb-2">
                {t("designer.codeExample")}
              </h5>
              <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
                <code>{getCodeExamples()}</code>
              </pre>
            </div>
          )}
        </div>

        {/* Available Variables Info */}
        <div className="p-3 bg-blue-50 rounded-md">
          <div className="flex items-start">
            <InformationCircleIcon className="h-4 w-4 text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <h5 className="text-sm font-medium text-blue-900 mb-1">
                {t("designer.availableVariables")}
              </h5>
              <div className="text-xs text-blue-700 space-y-1">
                <div className="grid grid-cols-2 gap-1">
                  <code>{"{{workflow.id}}"}</code>
                  <code>{"{{workflow.name}}"}</code>
                  <code>{"{{workflow.status}}"}</code>
                  <code>{"{{task.assignee}}"}</code>
                  <code>{"{{task.due_date}}"}</code>
                  <code>{"{{current_timestamp}}"}</code>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Handling */}
        <FormField label={t("designer.errorHandling")}>
          <select
            value={properties.errorHandling || "stop"}
            onChange={(e) => onPropertyChange("errorHandling", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="stop">{t("designer.stopOnError")}</option>
            <option value="continue">{t("designer.continueOnError")}</option>
            <option value="retry">{t("designer.retryOnError")}</option>
          </select>
        </FormField>

        {properties.errorHandling === "retry" && (
          <FormField label={t("designer.retryAttempts")}>
            <input
              type="number"
              value={properties.retryAttempts || 3}
              onChange={(e) =>
                onPropertyChange("retryAttempts", parseInt(e.target.value) || 3)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              min="1"
              max="10"
            />
          </FormField>
        )}
      </div>
    </PropertySection>
  );
};

export default AutomationProperties;
