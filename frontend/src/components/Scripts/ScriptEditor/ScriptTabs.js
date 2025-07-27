// src/components/Scripts/ScriptEditor/ScriptTabs.js
import React from "react";
import { useTranslation } from "react-i18next";
import {
  CodeBracketIcon,
  TagIcon,
  PlayIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

// Tab content components
import EditorTab from "./tabs/EditorTab";
import ParametersTab from "./tabs/ParametersTab";
import TestTab from "./tabs/TestTab";
import HistoryTab from "./tabs/HistoryTab";

const ScriptTabs = ({
  activeTab,
  onTabChange,
  script,
  onScriptChange,
  validationErrors,
  isEditing,
  scriptId,
  onShowTemplateModal,
}) => {
  const { t } = useTranslation();

  const tabs = [
    {
      id: "editor",
      name: t("scripts.editor.tabs.editor"),
      icon: CodeBracketIcon,
    },
    {
      id: "parameters",
      name: t("scripts.editor.tabs.parameters"),
      icon: TagIcon,
    },
    { id: "test", name: t("scripts.editor.tabs.test"), icon: PlayIcon },
    { id: "history", name: t("scripts.editor.tabs.history"), icon: ClockIcon },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "editor":
        return (
          <EditorTab
            script={script}
            onScriptChange={onScriptChange}
            validationErrors={validationErrors}
            onShowTemplateModal={onShowTemplateModal}
          />
        );
      case "parameters":
        return (
          <ParametersTab script={script} onScriptChange={onScriptChange} />
        );
      case "test":
        return (
          <TestTab script={script} isEditing={isEditing} scriptId={scriptId} />
        );
      case "history":
        return <HistoryTab />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Tabs Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
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

      {/* Tab Content */}
      {renderTabContent()}
    </>
  );
};

export default ScriptTabs;
