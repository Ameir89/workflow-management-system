// src/components/WorkflowDesigner/PropertiesPanel/components/node-types/AutomationProperties.js
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import {
  CodeBracketIcon,
  InformationCircleIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import FormField from "../../../../../components/Common/FormField";
import FormSelect from "../../../../../components/Common/FormSelect";
import FormTextarea from "../../../../../components/Common/FormTextarea";
import PropertySection from "../PropertySection";
import { lookupsService } from "../../../../../services/lookupsService";

const AutomationProperties = ({ node, onPropertyChange }) => {
  const { t } = useTranslation();
  const properties = node.properties || {};
  const [showExamples, setShowExamples] = useState(false);
  const [showScriptDetails, setShowScriptDetails] = useState(false);

  // Fetch scripts from lookup table
  const { data: scriptsLookupData, isLoading: scriptsLoading } = useQuery(
    ["lookup-scripts-for-workflow"],
    () =>
      lookupsService.getLookupOptions("scripts", {
        filters: {
          status: "active",
          categories: ["automation", "utility", "transformation", "validation"],
        },
      }),
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000, // 5 minutes cache
    }
  );

  // Get script details when one is selected
  const { data: selectedScriptDetails } = useQuery(
    ["script-details", properties.selectedScriptId],
    () =>
      lookupsService.getLookupData("scripts", {
        filters: { id: properties.selectedScriptId },
      }),
    {
      enabled: !!properties.selectedScriptId,
      keepPreviousData: true,
    }
  );

  const executionModeOptions = [
    { value: "script", label: "Execute Script" },
    { value: "inline", label: "Inline Code" },
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

  // Format script options from lookup data
  const scriptOptions = [
    { value: "", label: t("designer.selectScript") },
    ...(scriptsLookupData?.options || []).map((script) => ({
      value: script.value, // This will be the script ID
      label: `${script.label} (${script.category || "General"})`,
      data: script, // Store full script data for reference
    })),
  ];

  const selectedScript =
    selectedScriptDetails?.data?.[0] ||
    scriptsLookupData?.options?.find(
      (script) => script.value === properties.selectedScriptId
    );

  const getScriptPlaceholder = () => {
    const executionMode = properties.executionMode || "inline";
    switch (executionMode) {
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

  const renderExecutionModeSpecificFields = () => {
    const executionMode = properties.executionMode || "script";

    switch (executionMode) {
      case "script":
        return (
          <div className="space-y-4">
            <FormSelect
              label={t("designer.selectScript")}
              value={properties.selectedScriptId || ""}
              onChange={(e) => {
                const scriptId = e.target.value;
                const scriptOption = scriptsLookupData?.options?.find(
                  (s) => s.value === scriptId
                );

                onPropertyChange("selectedScriptId", scriptId);
                if (scriptOption) {
                  onPropertyChange("selectedScriptName", scriptOption.label);
                  onPropertyChange(
                    "selectedScriptCategory",
                    scriptOption.category || "general"
                  );

                  // Pre-populate script parameters if they exist in the script data
                  if (scriptOption.parameters) {
                    onPropertyChange(
                      "scriptParameters",
                      scriptOption.parameters
                    );
                  }
                }
              }}
              options={scriptOptions}
              disabled={scriptsLoading}
            />

            {scriptsLoading && (
              <div className="flex items-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
                Loading scripts...
              </div>
            )}

            {selectedScript && (
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-md">
                  <div className="flex items-start space-x-2">
                    <DocumentTextIcon className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h5 className="text-sm font-medium text-blue-900">
                        {selectedScript.label || selectedScript.name}
                      </h5>
                      <p className="text-xs text-blue-700 mt-1">
                        {selectedScript.description}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-blue-600">
                        <span>
                          Category: {selectedScript.category || "General"}
                        </span>
                        <span>
                          Language: {selectedScript.language || "JavaScript"}
                        </span>
                        {selectedScript.version && (
                          <span>Version: {selectedScript.version}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowScriptDetails(!showScriptDetails)}
                    className="text-xs text-blue-600 hover:text-blue-700 mt-2"
                  >
                    {showScriptDetails ? "Hide Details" : "Show Details"}
                  </button>
                </div>

                {showScriptDetails && selectedScript.preview_content && (
                  <div className="p-3 bg-gray-50 rounded-md">
                    <h6 className="text-xs font-medium text-gray-900 mb-2">
                      Script Preview:
                    </h6>
                    <pre className="text-xs bg-white p-2 rounded border overflow-x-auto max-h-32">
                      <code>{selectedScript.preview_content}</code>
                    </pre>
                  </div>
                )}

                {/* Script Parameters from Lookup Data */}
                {selectedScript.parameters &&
                  selectedScript.parameters.length > 0 && (
                    <div className="space-y-3">
                      <h6 className="text-sm font-medium text-gray-900">
                        Script Parameters:
                      </h6>
                      {selectedScript.parameters.map((param, index) => (
                        <FormField
                          key={index}
                          label={param.name}
                          help={param.description}
                        >
                          {param.type === "select" && param.options ? (
                            <select
                              value={
                                properties.scriptParameterValues?.[
                                  param.name
                                ] ||
                                param.default_value ||
                                ""
                              }
                              onChange={(e) => {
                                const currentValues =
                                  properties.scriptParameterValues || {};
                                onPropertyChange("scriptParameterValues", {
                                  ...currentValues,
                                  [param.name]: e.target.value,
                                });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="">Select {param.name}</option>
                              {param.options.map((option, optIndex) => (
                                <option key={optIndex} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : param.type === "textarea" ? (
                            <textarea
                              value={
                                properties.scriptParameterValues?.[
                                  param.name
                                ] ||
                                param.default_value ||
                                ""
                              }
                              onChange={(e) => {
                                const currentValues =
                                  properties.scriptParameterValues || {};
                                onPropertyChange("scriptParameterValues", {
                                  ...currentValues,
                                  [param.name]: e.target.value,
                                });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              rows={3}
                              placeholder={
                                param.placeholder || `Enter ${param.name}`
                              }
                            />
                          ) : (
                            <input
                              type={
                                param.type === "number"
                                  ? "number"
                                  : param.type === "email"
                                  ? "email"
                                  : "text"
                              }
                              value={
                                properties.scriptParameterValues?.[
                                  param.name
                                ] ||
                                param.default_value ||
                                ""
                              }
                              onChange={(e) => {
                                const currentValues =
                                  properties.scriptParameterValues || {};
                                onPropertyChange("scriptParameterValues", {
                                  ...currentValues,
                                  [param.name]: e.target.value,
                                });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder={
                                param.placeholder || `Enter ${param.name}`
                              }
                            />
                          )}
                          {param.required && (
                            <p className="text-xs text-red-600 mt-1">
                              Required parameter
                            </p>
                          )}
                        </FormField>
                      ))}
                    </div>
                  )}

                {/* Script Usage Instructions */}
                {selectedScript.usage_instructions && (
                  <div className="p-3 bg-yellow-50 rounded-md">
                    <h6 className="text-xs font-medium text-yellow-900 mb-1">
                      Usage Instructions:
                    </h6>
                    <p className="text-xs text-yellow-800">
                      {selectedScript.usage_instructions}
                    </p>
                  </div>
                )}

                {/* Script Dependencies */}
                {selectedScript.dependencies &&
                  selectedScript.dependencies.length > 0 && (
                    <div className="p-3 bg-gray-50 rounded-md">
                      <h6 className="text-xs font-medium text-gray-900 mb-1">
                        Dependencies:
                      </h6>
                      <div className="flex flex-wrap gap-1">
                        {selectedScript.dependencies.map((dep, index) => (
                          <span
                            key={index}
                            className="text-xs bg-gray-200 px-2 py-1 rounded"
                          >
                            {dep}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}

            {/* No Scripts Available Message */}
            {!scriptsLoading &&
              (!scriptsLookupData?.options ||
                scriptsLookupData.options.length === 0) && (
                <div className="p-3 bg-gray-50 rounded-md text-center">
                  <p className="text-sm text-gray-600">
                    No scripts available for workflow automation.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Create scripts in the Scripts section to use them in
                    workflows.
                  </p>
                </div>
              )}
          </div>
        );

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
    const executionMode = properties.executionMode || "inline";
    const examples = {
      inline: `// Access workflow data
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
    return examples[executionMode] || examples.inline;
  };

  return (
    <PropertySection title={t("designer.automationProperties")}>
      <div className="space-y-4">
        <FormSelect
          label={t("designer.executionMode")}
          value={properties.executionMode || "script"}
          onChange={(e) => onPropertyChange("executionMode", e.target.value)}
          options={executionModeOptions}
        />

        {renderExecutionModeSpecificFields()}

        {/* Inline code editor for non-script modes */}
        {properties.executionMode !== "script" && (
          <FormField label={t("designer.script")} required>
            <FormTextarea
              value={properties.script || ""}
              onChange={(e) => onPropertyChange("script", e.target.value)}
              rows={10}
              className="font-mono text-sm"
              placeholder={getScriptPlaceholder()}
            />
          </FormField>
        )}

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

        {/* Code Examples Section - only for inline mode */}
        {properties.executionMode !== "script" && (
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
        )}

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
