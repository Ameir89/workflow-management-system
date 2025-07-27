// src/components/WorkflowDesigner/PropertiesPanel/components/node-types/notification/NotificationTiming.js
import React from "react";
import { useTranslation } from "react-i18next";
import FormField from "../../../../../../Common/FormField";

const NotificationTiming = ({ properties, onPropertyChange }) => {
  const { t } = useTranslation();

  return (
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
            {t("designer.sendNotificationImmediately")}
          </span>
        </label>
      </FormField>

      {properties.sendImmediately === false && (
        <FormField label={t("designer.delayMinutes")}>
          <input
            type="number"
            value={properties.delayMinutes || 0}
            onChange={(e) =>
              onPropertyChange("delayMinutes", parseInt(e.target.value) || 0)
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
    </div>
  );
};

export default NotificationTiming;
