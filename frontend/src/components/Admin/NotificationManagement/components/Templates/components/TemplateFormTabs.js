// src/components/Notifications/Templates/components/TemplateFormTabs.js
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  DocumentTextIcon,
  CodeBracketIcon,
  AdjustmentsHorizontalIcon,
  PaintBrushIcon,
  EyeIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

const TemplateFormTabs = ({ activeTab, onTabChange, errors, channel }) => {
  const { t } = useTranslation();

  const tabs = useMemo(
    () => [
      {
        id: "basic",
        name: t("notifications.basic"),
        icon: DocumentTextIcon,
        hasErrors: !!(errors.name || errors.channel),
      },
      {
        id: "content",
        name: t("notifications.content"),
        icon: CodeBracketIcon,
        hasErrors: !!(errors.subject || errors.content),
      },
      {
        id: "variables",
        name: t("notifications.variables"),
        icon: AdjustmentsHorizontalIcon,
      },
      {
        id: "styling",
        name: t("notifications.styling"),
        icon: PaintBrushIcon,
        disabled: channel !== "email",
      },
      {
        id: "preview",
        name: t("notifications.preview"),
        icon: EyeIcon,
      },
    ],
    [t, errors, channel]
  );

  return (
    <div className="border-b border-gray-200">
      <nav className="flex space-x-8 px-6" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => !tab.disabled && onTabChange(tab.id)}
            disabled={tab.disabled}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
              activeTab === tab.id
                ? "border-indigo-500 text-indigo-600"
                : tab.disabled
                ? "border-transparent text-gray-300 cursor-not-allowed"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.name}</span>
            {tab.hasErrors && (
              <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default TemplateFormTabs;
