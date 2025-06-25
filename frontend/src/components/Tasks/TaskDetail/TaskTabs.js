import React from "react";
import {
  InformationCircleIcon,
  DocumentTextIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";

const TaskTabs = ({ activeTab, setActiveTab, hasForm }) => {
  const tabs = [
    { id: "details", name: "Details", icon: InformationCircleIcon },
    {
      id: "form",
      name: "Form",
      icon: DocumentTextIcon,
      show: hasForm,
    },
    { id: "history", name: "History", icon: ClockIcon },
    { id: "comments", name: "Comments", icon: ChatBubbleLeftRightIcon },
  ].filter((tab) => tab.show !== false);

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                activeTab === tab.id
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default TaskTabs;
