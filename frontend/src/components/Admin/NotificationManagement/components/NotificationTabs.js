// src/components/Admin/NotificationManagement/components/NotificationTabs.js
import React from "react";
import {
  DocumentTextIcon,
  ClockIcon,
  CogIcon,
} from "@heroicons/react/24/outline";

const NotificationTabs = ({ tabs, activeTab, onTabChange }) => {
  const getTabIcon = (tabId) => {
    switch (tabId) {
      case "templates":
        return DocumentTextIcon;
      case "history":
        return ClockIcon;
      case "settings":
        return CogIcon;
      default:
        return DocumentTextIcon;
    }
  };

  return (
    <div className="border-b border-gray-200">
      <nav className="flex space-x-8 px-6" aria-label="Tabs">
        {tabs.map((tab) => {
          const IconComponent = getTabIcon(tab.id);
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                activeTab === tab.id
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <IconComponent className="h-4 w-4" />
              <span>{tab.name}</span>
              {tab.count !== undefined && (
                <span className="bg-gray-100 text-gray-900 text-xs rounded-full px-2 py-0.5">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default NotificationTabs;
