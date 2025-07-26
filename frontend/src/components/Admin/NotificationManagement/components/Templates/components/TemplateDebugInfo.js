// src/components/Admin/NotificationManagement/components/Templates/components/TemplateDebugInfo.js
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BugAntIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";

const TemplateDebugInfo = ({
  originalData,
  formData,
  variables,
  watchedValues,
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  // Only show in development mode
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center w-full text-left"
      >
        <BugAntIcon className="h-5 w-5 text-yellow-600 mr-2" />
        <span className="font-medium text-yellow-800">
          {t("notifications.debugInfo")}
        </span>
        {isExpanded ? (
          <ChevronUpIcon className="h-4 w-4 text-yellow-600 ml-auto" />
        ) : (
          <ChevronDownIcon className="h-4 w-4 text-yellow-600 ml-auto" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Original API Data */}
          <div>
            <h4 className="text-sm font-semibold text-yellow-800 mb-2">
              {t("notifications.originalApiData")}
            </h4>
            <pre className="bg-white p-3 rounded border text-xs overflow-auto max-h-40">
              {JSON.stringify(originalData, null, 2)}
            </pre>
          </div>

          {/* Parsed Form Data */}
          <div>
            <h4 className="text-sm font-semibold text-yellow-800 mb-2">
              {t("notifications.parsedFormData")}
            </h4>
            <pre className="bg-white p-3 rounded border text-xs overflow-auto max-h-40">
              {JSON.stringify(formData, null, 2)}
            </pre>
          </div>

          {/* Current Watched Values */}
          <div>
            <h4 className="text-sm font-semibold text-yellow-800 mb-2">
              {t("notifications.currentWatchedValues")}
            </h4>
            <pre className="bg-white p-3 rounded border text-xs overflow-auto max-h-40">
              {JSON.stringify(watchedValues, null, 2)}
            </pre>
          </div>

          {/* Variables */}
          <div>
            <h4 className="text-sm font-semibold text-yellow-800 mb-2">
              {t("notifications.variables")} ({variables.length}):
            </h4>
            <pre className="bg-white p-3 rounded border text-xs overflow-auto max-h-40">
              {JSON.stringify(variables, null, 2)}
            </pre>
          </div>

          {/* Field Mappings */}
          <div>
            <h4 className="text-sm font-semibold text-yellow-800 mb-2">
              {t("notifications.fieldMappings")}
            </h4>
            <div className="bg-white p-3 rounded border text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <strong>
                    {t("notifications.api")} → {t("notifications.form")}
                  </strong>
                  <ul className="mt-1 space-y-1">
                    <li>
                      • {t("notifications.subject")} →{" "}
                      {t("notifications.titleTemplate")}
                    </li>
                    <li>
                      • {t("notifications.content")} →{" "}
                      {t("notifications.messageTemplate")}
                    </li>
                    <li>
                      • {t("notifications.channel")} →{" "}
                      {t("notifications.channel")}
                    </li>
                    <li>
                      • {t("notifications.tags")} → {t("notifications.tags")}
                    </li>
                  </ul>
                </div>
                <div>
                  <strong>Form → API:</strong>
                  <ul className="mt-1 space-y-1">
                    <li>• subject → title_template</li>
                    <li>• content → message_template</li>
                    <li>• channel → channels[]</li>
                    <li>• tags.split(",") → tags</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateDebugInfo;
