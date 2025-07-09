import React from "react";
import {
  InformationCircleIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";

const InstanceTabs = ({ tabs, activeTab, onTabChange }) => {
  const iconMap = {
    overview: InformationCircleIcon,
    tasks: ClipboardDocumentListIcon,
    timeline: ClockIcon,
    data: DocumentDuplicateIcon,
  };

  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8">
        {tabs.map((tab) => {
          const IconComponent = iconMap[tab.id] || InformationCircleIcon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <IconComponent className="h-5 w-5 mr-2" />
              {tab.name}
              {tab.count !== undefined && tab.count !== null && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-900">
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

export default InstanceTabs;
