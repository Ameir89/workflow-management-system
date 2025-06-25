// src/components/WorkflowDesigner/PropertiesPanel/components/node-types/NotificationProperties.js
import React from "react";
import { useTranslation } from "react-i18next";
import FormField from "../../../../../components/Common/FormField";
import FormSelect from "../../../../../components/Common/FormSelect";
import FormTextarea from "../../../../../components/Common/FormTextarea";
import PropertySection from "../PropertySection";

const NotificationProperties = ({ node, onPropertyChange }) => {
  const { t } = useTranslation();
  const properties = node.properties || {};

  const channelOptions = [
    { value: "email", label: t("designer.email") },
    { value: "sms", label: t("designer.sms") },
    { value: "in_app", label: t("designer.inApp") },
    { value: "webhook", label: t("designer.webhook") },
  ];

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

  return (
    <PropertySection title={t("designer.notificationProperties")}>
      <div className="space-y-4">
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

        {/* Template Variables Info */}
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
      </div>
    </PropertySection>
  );
};

export default NotificationProperties;
