// src/components/WorkflowDesigner/PropertiesPanel/components/node-types/notification/CustomNotificationForm.js
import React from "react";
import { useTranslation } from "react-i18next";
import FormField from "../../../../../../Common/FormField";
import FormSelect from "../../../../../../Common/FormSelect";
import FormTextarea from "../../../../../../Common/FormTextarea";
import AvailableVariables from "./AvailableVariables";

const CustomNotificationForm = ({ properties, onPropertyChange }) => {
  const { t } = useTranslation();

  const channelOptions = [
    { value: "email", label: t("designer.email") },
    { value: "sms", label: t("designer.sms") },
    { value: "in_app", label: t("designer.inApp") },
    { value: "webhook", label: t("designer.webhook") },
  ];

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

      {/* Available Variables Info */}
      <AvailableVariables />
    </div>
  );
};

export default CustomNotificationForm;
