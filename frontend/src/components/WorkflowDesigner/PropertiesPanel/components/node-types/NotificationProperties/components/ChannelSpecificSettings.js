// src/components/WorkflowDesigner/PropertiesPanel/components/node-types/notification/ChannelSpecificSettings.js
import React from "react";
import { useTranslation } from "react-i18next";
import FormField from "../../../../../../Common/FormField";

const ChannelSpecificSettings = ({ channel, properties, onPropertyChange }) => {
  const { t } = useTranslation();

  if (channel !== "webhook") {
    return null;
  }

  return (
    <div className="border-t pt-4">
      <h6 className="text-sm font-medium text-gray-900 mb-3">
        Channel-Specific Settings
      </h6>

      <FormField label={t("designer.webhookUrl")} required>
        <input
          type="url"
          value={properties.webhookUrl || ""}
          onChange={(e) => onPropertyChange("webhookUrl", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="https://api.example.com/webhook"
        />
      </FormField>
    </div>
  );
};

export default ChannelSpecificSettings;
