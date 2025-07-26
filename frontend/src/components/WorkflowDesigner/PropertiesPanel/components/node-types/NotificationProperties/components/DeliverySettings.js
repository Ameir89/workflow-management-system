// src/components/WorkflowDesigner/PropertiesPanel/components/node-types/notification/DeliverySettings.js
import React from "react";
import { useTranslation } from "react-i18next";
import FormField from "../../../../../../Common/FormField";

const DeliverySettings = ({ properties, onPropertyChange }) => {
  const { t } = useTranslation();

  return (
    <div className="border-t pt-4">
      <h6 className="text-sm font-medium text-gray-900 mb-3">
        Delivery Settings
      </h6>

      <FormField label={t("designer.enableRetry")}>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={properties.enableRetry !== false}
            onChange={(e) => onPropertyChange("enableRetry", e.target.checked)}
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
                onPropertyChange("maxRetries", parseInt(e.target.value) || 3)
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
                onPropertyChange("retryDelay", parseInt(e.target.value) || 5)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              min="1"
              max="60"
            />
          </FormField>
        </div>
      )}
    </div>
  );
};

export default DeliverySettings;
