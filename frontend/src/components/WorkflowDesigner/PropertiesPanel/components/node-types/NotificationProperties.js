// src/components/WorkflowDesigner/PropertiesPanel/components/node-types/NotificationProperties.js
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import {
  DocumentTextIcon,
  InformationCircleIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import FormField from "../../../../../components/Common/FormField";
import FormSelect from "../../../../../components/Common/FormSelect";
import FormTextarea from "../../../../../components/Common/FormTextarea";
import PropertySection from "../PropertySection";
import { lookupsService } from "../../../../../services/lookupsService";

const NotificationProperties = ({ node, onPropertyChange }) => {
  const { t } = useTranslation();
  const properties = node.properties || {};
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);

  // Fetch notification templates from lookup table
  const { data: templatesLookupData, isLoading: templatesLoading } = useQuery(
    ["lookup-notification-templates-for-workflow"],
    () =>
      lookupsService.getLookupOptions("notification_templates", {
        filters: {
          is_active: true,
          categories: ["workflow", "task", "system", "reminder", "alert"],
        },
      }),
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000, // 5 minutes cache
    }
  );

  // Get template details when one is selected
  const { data: selectedTemplateDetails } = useQuery(
    ["notification-template-details", properties.selectedTemplateId],
    () =>
      lookupsService.getLookupData("notification_templates", {
        filters: { id: properties.selectedTemplateId },
      }),
    {
      enabled: !!properties.selectedTemplateId,
      keepPreviousData: true,
    }
  );

  const notificationModeOptions = [
    { value: "template", label: "Use Template" },
    { value: "custom", label: "Custom Message" },
  ];

  const channelOptions = [
    { value: "email", label: t("designer.email") },
    { value: "sms", label: t("designer.sms") },
    { value: "in_app", label: t("designer.inApp") },
    { value: "webhook", label: t("designer.webhook") },
  ];

  // Format template options from lookup data
  const templateOptions = [
    { value: "", label: t("designer.selectTemplate") },
    ...(templatesLookupData?.options || []).map((template) => ({
      value: template.value, // This will be the template ID
      label: `${template.label} (${template.channel || "Email"})`,
      data: template, // Store full template data for reference
    })),
  ];

  const selectedTemplate =
    selectedTemplateDetails?.data?.[0] ||
    templatesLookupData?.options?.find(
      (template) => template.value === properties.selectedTemplateId
    );

  const handleRecipientsChange = (value) => {
    const recipients = value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    onPropertyChange("recipients", recipients);
  };

  const getTemplatePlaceholder = () => {
    const channel = properties.channel || "email";
    switch (channel) {
      case "email":
        return t("designer.emailTemplatePlaceholder");
      case "sms":
        return t("designer.smsTemplatePlaceholder");
      case "in_app":
        return t("designer.inAppTemplatePlaceholder");
      default:
        return t("designer.templatePlaceholder");
    }
  };

  const generatePreviewContent = (template, variables = {}) => {
    let content = template.content || template.template_content || "";

    // Replace common variables with example values
    const exampleVariables = {
      workflow_name: "Sample Workflow",
      task_name: "Sample Task",
      assignee: "John Doe",
      due_date: "2024-07-15",
      requester: "Jane Smith",
      status: "Pending",
      ...variables,
    };

    Object.entries(exampleVariables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
      content = content.replace(regex, value);
    });

    return content;
  };

  return (
    <PropertySection title={t("designer.notificationProperties")}>
      <div className="space-y-4">
        <FormSelect
          label={t("designer.notificationMode")}
          value={properties.notificationMode || "template"}
          onChange={(e) => onPropertyChange("notificationMode", e.target.value)}
          options={notificationModeOptions}
        />

        {properties.notificationMode === "template" ? (
          // Template Mode
          <div className="space-y-4">
            <FormSelect
              label={t("designer.selectTemplate")}
              value={properties.selectedTemplateId || ""}
              onChange={(e) => {
                const templateId = e.target.value;
                const templateOption = templatesLookupData?.options?.find(
                  (t) => t.value === templateId
                );

                onPropertyChange("selectedTemplateId", templateId);
                if (templateOption) {
                  onPropertyChange(
                    "selectedTemplateName",
                    templateOption.label
                  );
                  onPropertyChange(
                    "channel",
                    templateOption.channel || "email"
                  );

                  // Pre-populate recipients if template has defaults
                  if (templateOption.default_recipients) {
                    onPropertyChange(
                      "recipients",
                      templateOption.default_recipients
                    );
                  }
                }
              }}
              options={templateOptions}
              disabled={templatesLoading}
            />

            {templatesLoading && (
              <div className="flex items-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
                Loading templates...
              </div>
            )}

            {selectedTemplate && (
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-md">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-2">
                      <DocumentTextIcon className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <h5 className="text-sm font-medium text-blue-900">
                          {selectedTemplate.label || selectedTemplate.name}
                        </h5>
                        <p className="text-xs text-blue-700 mt-1">
                          {selectedTemplate.description}
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-blue-600">
                          <span>
                            Channel: {selectedTemplate.channel || "Email"}
                          </span>
                          <span>
                            Category: {selectedTemplate.category || "General"}
                          </span>
                          {selectedTemplate.language && (
                            <span>Language: {selectedTemplate.language}</span>
                          )}
                          {selectedTemplate.version && (
                            <span>Version: {selectedTemplate.version}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setShowTemplatePreview(!showTemplatePreview)
                      }
                      className="flex items-center text-xs text-blue-600 hover:text-blue-700"
                    >
                      <EyeIcon className="h-3 w-3 mr-1" />
                      {showTemplatePreview ? "Hide" : "Preview"}
                    </button>
                  </div>
                </div>

                {showTemplatePreview && (
                  <div className="p-3 bg-gray-50 rounded-md">
                    <h6 className="text-xs font-medium text-gray-900 mb-2">
                      Template Preview:
                    </h6>

                    {(selectedTemplate.subject ||
                      selectedTemplate.email_subject) && (
                      <div className="mb-2">
                        <div className="text-xs text-gray-600">Subject:</div>
                        <div className="text-sm bg-white p-2 rounded border">
                          {selectedTemplate.subject ||
                            selectedTemplate.email_subject}
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-gray-600 mb-1">Content:</div>
                    <div className="text-sm bg-white p-2 rounded border max-h-32 overflow-y-auto">
                      <div className="whitespace-pre-wrap">
                        {generatePreviewContent(selectedTemplate)}
                      </div>
                    </div>

                    {selectedTemplate.variables_list &&
                      selectedTemplate.variables_list.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs text-gray-600 mb-1">
                            Available Variables:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {selectedTemplate.variables_list.map(
                              (variable, index) => (
                                <code
                                  key={index}
                                  className="text-xs bg-blue-100 px-1 py-0.5 rounded"
                                >
                                  {`{{${variable}}}`}
                                </code>
                              )
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                )}

                {/* Template Variable Overrides from Lookup Data */}
                {selectedTemplate.variables_list &&
                  selectedTemplate.variables_list.length > 0 && (
                    <div className="space-y-3">
                      <h6 className="text-sm font-medium text-gray-900">
                        Variable Values:
                      </h6>
                      <div className="text-xs text-gray-600 mb-2">
                        Override default variable values for this workflow step:
                      </div>
                      {selectedTemplate.variables_list.map(
                        (variableKey, index) => {
                          // Get variable info from template data if available
                          const variableInfo =
                            selectedTemplate.variable_definitions?.[
                              variableKey
                            ] || {};

                          return (
                            <FormField
                              key={index}
                              label={variableKey}
                              help={
                                variableInfo.description ||
                                `Set value for ${variableKey}`
                              }
                            >
                              {variableInfo.type === "select" &&
                              variableInfo.options ? (
                                <select
                                  value={
                                    properties.templateVariableValues?.[
                                      variableKey
                                    ] ||
                                    variableInfo.default_value ||
                                    ""
                                  }
                                  onChange={(e) => {
                                    const currentValues =
                                      properties.templateVariableValues || {};
                                    onPropertyChange("templateVariableValues", {
                                      ...currentValues,
                                      [variableKey]: e.target.value,
                                    });
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                  <option value="">Select {variableKey}</option>
                                  {variableInfo.options.map(
                                    (option, optIndex) => (
                                      <option
                                        key={optIndex}
                                        value={option.value || option}
                                      >
                                        {option.label || option}
                                      </option>
                                    )
                                  )}
                                </select>
                              ) : variableInfo.type === "textarea" ? (
                                <textarea
                                  value={
                                    properties.templateVariableValues?.[
                                      variableKey
                                    ] ||
                                    variableInfo.default_value ||
                                    ""
                                  }
                                  onChange={(e) => {
                                    const currentValues =
                                      properties.templateVariableValues || {};
                                    onPropertyChange("templateVariableValues", {
                                      ...currentValues,
                                      [variableKey]: e.target.value,
                                    });
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  rows={3}
                                  placeholder={
                                    variableInfo.placeholder ||
                                    `Enter ${variableKey}`
                                  }
                                />
                              ) : (
                                <input
                                  type={
                                    variableInfo.type === "number"
                                      ? "number"
                                      : variableInfo.type === "email"
                                      ? "email"
                                      : "text"
                                  }
                                  value={
                                    properties.templateVariableValues?.[
                                      variableKey
                                    ] ||
                                    variableInfo.default_value ||
                                    ""
                                  }
                                  onChange={(e) => {
                                    const currentValues =
                                      properties.templateVariableValues || {};
                                    onPropertyChange("templateVariableValues", {
                                      ...currentValues,
                                      [variableKey]: e.target.value,
                                    });
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  placeholder={
                                    variableInfo.placeholder ||
                                    variableInfo.example ||
                                    `Enter ${variableKey}`
                                  }
                                />
                              )}
                            </FormField>
                          );
                        }
                      )}
                    </div>
                  )}

                {/* Template Usage Instructions */}
                {selectedTemplate.usage_instructions && (
                  <div className="p-3 bg-yellow-50 rounded-md">
                    <h6 className="text-xs font-medium text-yellow-900 mb-1">
                      Usage Instructions:
                    </h6>
                    <p className="text-xs text-yellow-800">
                      {selectedTemplate.usage_instructions}
                    </p>
                  </div>
                )}

                {/* Template Restrictions */}
                {selectedTemplate.restrictions && (
                  <div className="p-3 bg-red-50 rounded-md">
                    <h6 className="text-xs font-medium text-red-900 mb-1">
                      Restrictions:
                    </h6>
                    <p className="text-xs text-red-800">
                      {selectedTemplate.restrictions}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* No Templates Available Message */}
            {!templatesLoading &&
              (!templatesLookupData?.options ||
                templatesLookupData.options.length === 0) && (
                <div className="p-3 bg-gray-50 rounded-md text-center">
                  <p className="text-sm text-gray-600">
                    No notification templates available for workflows.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Create notification templates in the Notification Management
                    section to use them in workflows.
                  </p>
                </div>
              )}
          </div>
        ) : (
          // Custom Mode
          <div className="space-y-4">
            <FormSelect
              label={t("designer.channel")}
              value={properties.channel || "email"}
              onChange={(e) => onPropertyChange("channel", e.target.value)}
              options={channelOptions}
            />

            {properties.channel === "email" && (
              <FormField
                label={t("designer.emailSubject")}
                help={t("designer.emailSubjectHelp")}
              >
                <input
                  type="text"
                  value={properties.subject || ""}
                  onChange={(e) => onPropertyChange("subject", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={t("designer.emailSubjectPlaceholder")}
                />
              </FormField>
            )}

            <FormField
              label={t("designer.template")}
              required
              help={t("designer.templateHelp")}
            >
              <FormTextarea
                value={properties.template || ""}
                onChange={(e) => onPropertyChange("template", e.target.value)}
                rows={6}
                placeholder={getTemplatePlaceholder()}
              />
            </FormField>
          </div>
        )}

        <FormField
          label={t("designer.recipients")}
          required
          help={t("designer.recipientsHelp")}
        >
          <FormTextarea
            value={properties.recipients?.join(", ") || ""}
            onChange={(e) => handleRecipientsChange(e.target.value)}
            rows={2}
            placeholder="user1@example.com, user2@example.com"
          />
        </FormField>

        {/* Template Variables Info for custom mode */}
        {properties.notificationMode !== "template" && (
          <div className="p-3 bg-blue-50 rounded-md">
            <h5 className="text-sm font-medium text-blue-900 mb-2">
              {t("designer.availableVariables")}
            </h5>
            <div className="text-xs text-blue-700 space-y-1">
              <div className="grid grid-cols-2 gap-2">
                <code>{`{{workflow_name}}`}</code>
                <code>{`{{task_name}}`}</code>
                <code>{`{{assignee}}`}</code>
                <code>{`{{due_date}}`}</code>
                <code>{`{{requester}}`}</code>
                <code>{`{{status}}`}</code>
              </div>
            </div>
          </div>
        )}

        {/* Channel-specific settings */}
        {properties.channel === "webhook" && (
          <FormField label={t("designer.webhookUrl")} required>
            <input
              type="url"
              value={properties.webhookUrl || ""}
              onChange={(e) => onPropertyChange("webhookUrl", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="https://api.example.com/webhook"
            />
          </FormField>
        )}

        {/* Notification Timing */}
        <div className="border-t pt-4">
          <h6 className="text-sm font-medium text-gray-900 mb-3">
            Notification Timing
          </h6>

          <FormField label={t("designer.sendImmediately")}>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={properties.sendImmediately !== false}
                onChange={(e) =>
                  onPropertyChange("sendImmediately", e.target.checked)
                }
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                Send notification immediately
              </span>
            </label>
          </FormField>

          {properties.sendImmediately === false && (
            <FormField label={t("designer.delayMinutes")}>
              <input
                type="number"
                value={properties.delayMinutes || 0}
                onChange={(e) =>
                  onPropertyChange(
                    "delayMinutes",
                    parseInt(e.target.value) || 0
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                min="0"
                max="1440"
                placeholder="0"
              />
              <div className="mt-1 text-xs text-gray-500">
                Delay in minutes (0-1440)
              </div>
            </FormField>
          )}
        </div>

        {/* Notification Priority */}
        <FormField label={t("designer.notificationPriority")}>
          <select
            value={properties.priority || "normal"}
            onChange={(e) => onPropertyChange("priority", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="low">Low Priority</option>
            <option value="normal">Normal Priority</option>
            <option value="high">High Priority</option>
            <option value="urgent">Urgent</option>
          </select>
        </FormField>

        {/* Retry Settings */}
        <div className="border-t pt-4">
          <h6 className="text-sm font-medium text-gray-900 mb-3">
            Delivery Settings
          </h6>

          <FormField label={t("designer.enableRetry")}>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={properties.enableRetry !== false}
                onChange={(e) =>
                  onPropertyChange("enableRetry", e.target.checked)
                }
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                Enable retry on failure
              </span>
            </label>
          </FormField>

          {properties.enableRetry !== false && (
            <div className="grid grid-cols-2 gap-4">
              <FormField label={t("designer.maxRetries")}>
                <input
                  type="number"
                  value={properties.maxRetries || 3}
                  onChange={(e) =>
                    onPropertyChange(
                      "maxRetries",
                      parseInt(e.target.value) || 3
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  min="1"
                  max="10"
                />
              </FormField>

              <FormField label={t("designer.retryDelayMinutes")}>
                <input
                  type="number"
                  value={properties.retryDelay || 5}
                  onChange={(e) =>
                    onPropertyChange(
                      "retryDelay",
                      parseInt(e.target.value) || 5
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  min="1"
                  max="60"
                />
              </FormField>
            </div>
          )}
        </div>

        {/* Help Information */}
        <div className="p-3 bg-blue-50 rounded-md">
          <div className="flex items-start">
            <InformationCircleIcon className="h-4 w-4 text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <h5 className="text-sm font-medium text-blue-900 mb-1">
                {t("designer.notificationTips")}
              </h5>
              <div className="text-xs text-blue-700 space-y-1">
                <p>• Use templates for consistent messaging across workflows</p>
                <p>
                  • Variables will be replaced with actual workflow data at
                  runtime
                </p>
                <p>
                  • Test your notifications with sample data before deploying
                </p>
                <p>• Consider recipient preferences and notification timing</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PropertySection>
  );
};

export default NotificationProperties;
