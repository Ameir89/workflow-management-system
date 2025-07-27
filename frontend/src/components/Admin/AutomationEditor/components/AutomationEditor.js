// src/pages/AutomationEditor/components/AutomationEditor.js
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Editor from "@monaco-editor/react";
import {
  DocumentTextIcon,
  PlayCircleIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import LoadingSpinner from "../../../Common/LoadingSpinner";
import { AUTOMATION_EXAMPLES } from "../../../../consts/AutomationExamples";

const AutomationEditor = ({
  script,
  validationErrors = [],
  onChange,
  onValidate,
  onTest,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const [selectedExample, setSelectedExample] = useState("");
  const [showExamples, setShowExamples] = useState(false);
  const [editorTheme, setEditorTheme] = useState("vs-light");

  // Monaco Editor configuration
  const editorOptions = {
    selectOnLineNumbers: true,
    roundedSelection: false,
    readOnly: false,
    cursorStyle: "line",
    automaticLayout: true,
    minimap: { enabled: true },
    scrollBeyondLastLine: false,
    wordWrap: "on",
    fontSize: 14,
    lineNumbers: "on",
    folding: true,
    renderWhitespace: "selection",
    bracketPairColorization: { enabled: true },
    suggest: {
      showKeywords: true,
      showSnippets: true,
      showFunctions: true,
    },
  };

  // Handle editor mount
  const handleEditorDidMount = (editor, monaco) => {
    // Add custom keyboard shortcuts
    editor.addAction({
      id: "save-script",
      label: "Save Script",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => {
        // Trigger save event
        window.dispatchEvent(new CustomEvent("editorSave"));
      },
    });

    // Add custom suggestions for workflow variables
    monaco.languages.registerCompletionItemProvider("javascript", {
      provideCompletionItems: (model, position) => {
        const suggestions = [
          {
            label: "workflow_instance_id",
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: "{{workflow_instance_id}}",
            documentation: "Current workflow instance ID",
          },
          {
            label: "workflow_data",
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: "{{workflow_data.}}",
            documentation: "Workflow data object",
          },
          {
            label: "user",
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: "{{user.}}",
            documentation: "Current user object",
          },
          {
            label: "context",
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: "context",
            documentation: "Script execution context",
          },
        ];
        return { suggestions };
      },
    });
  };

  // Handle example selection
  const handleExampleSelect = (exampleKey) => {
    const example = AUTOMATION_EXAMPLES[exampleKey];
    if (example) {
      const content =
        script.language === "json"
          ? JSON.stringify(example.config, null, 2)
          : script.language === "python" && example.config.script
          ? example.config.script
          : JSON.stringify(example.config, null, 2);

      onChange("content", content);
      if (!script.name) {
        onChange("name", example.name);
      }
      if (!script.description) {
        onChange("description", example.description);
      }
      if (!script.category) {
        onChange("category", example.type);
      }
      setSelectedExample(exampleKey);
      setShowExamples(false);
    }
  };

  // Get language for Monaco editor
  const getEditorLanguage = () => {
    switch (script.language) {
      case "python":
        return "python";
      case "javascript":
        return "javascript";
      case "json":
        return "json";
      default:
        return "javascript";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Left Panel - Examples and Help */}
      <div className="lg:col-span-1 space-y-6">
        {/* Examples Panel */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <button
              onClick={() => setShowExamples(!showExamples)}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center">
                <LightBulbIcon className="h-5 w-5 text-yellow-500 mr-2" />
                <h3 className="text-sm font-medium text-gray-900">
                  {t("automation.examples")}
                </h3>
              </div>
              {showExamples ? (
                <ChevronDownIcon className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRightIcon className="h-4 w-4 text-gray-500" />
              )}
            </button>
          </div>

          {showExamples && (
            <div className="p-4 space-y-2">
              {Object.entries(AUTOMATION_EXAMPLES).map(([key, example]) => (
                <button
                  key={key}
                  onClick={() => handleExampleSelect(key)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedExample === key
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="text-sm font-medium text-gray-900">
                    {example.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {example.description}
                  </div>
                  <div className="text-xs text-indigo-600 mt-1">
                    {example.type}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Validation Results */}
        {validationErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
              <h4 className="text-sm font-medium text-red-800">
                {t("automation.validationErrors")}
              </h4>
            </div>
            <ul className="text-sm text-red-700 space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-red-400 mr-2">•</span>
                  {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Help Panel */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <InformationCircleIcon className="h-5 w-5 text-blue-400 mr-2" />
            <h4 className="text-sm font-medium text-blue-800">
              {t("automation.help.title")}
            </h4>
          </div>
          <div className="text-sm text-blue-700 space-y-2">
            <p>{t("automation.help.variablesInfo")}</p>
            <ul className="space-y-1 text-xs">
              <li>
                • <code>{"{{workflow_instance_id}}"}</code> -{" "}
                {t("automation.help.workflowId")}
              </li>
              <li>
                • <code>{"{{workflow_data.field}}"}</code> -{" "}
                {t("automation.help.workflowData")}
              </li>
              <li>
                • <code>{"{{user.email}}"}</code> -{" "}
                {t("automation.help.userEmail")}
              </li>
              <li>
                • <code>context</code> - {t("automation.help.context")}
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Right Panel - Editor */}
      <div className="lg:col-span-3">
        <div className="bg-white rounded-lg shadow">
          {/* Editor Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <DocumentTextIcon className="h-5 w-5 text-gray-500" />
              <div>
                <h3 className="text-sm font-medium text-gray-900">
                  {t("automation.scriptEditor")}
                </h3>
                <p className="text-xs text-gray-500">
                  {script.language?.toUpperCase()} •{" "}
                  {script.content?.length || 0} characters
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={editorTheme}
                onChange={(e) => setEditorTheme(e.target.value)}
                className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="vs-light">{t("automation.theme.light")}</option>
                <option value="vs-dark">{t("automation.theme.dark")}</option>
                <option value="hc-black">
                  {t("automation.theme.highContrast")}
                </option>
              </select>

              <button
                onClick={onValidate}
                disabled={!script.content || isLoading}
                className="btn btn-outline btn-xs"
              >
                {t("automation.validate")}
              </button>

              <button
                onClick={() => onTest()}
                disabled={
                  !script.content || validationErrors.length > 0 || isLoading
                }
                className="btn btn-primary btn-xs"
              >
                <PlayCircleIcon className="h-3 w-3 mr-1" />
                {t("automation.test")}
              </button>
            </div>
          </div>

          {/* Editor */}
          <div className="relative">
            {isLoading && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
                <LoadingSpinner size="sm" />
              </div>
            )}

            <div className="h-96">
              <Editor
                height="100%"
                language={getEditorLanguage()}
                theme={editorTheme}
                value={script.content}
                onChange={(value) => onChange("content", value || "")}
                onMount={handleEditorDidMount}
                options={editorOptions}
                loading={
                  <LoadingSpinner
                    size="sm"
                    text={t("automation.loadingEditor")}
                  />
                }
              />
            </div>
          </div>

          {/* Editor Footer */}
          <div className="flex items-center justify-between p-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              <span>
                {t("automation.language")}: {script.language?.toUpperCase()}
              </span>
              <span>
                {t("automation.lines")}:{" "}
                {script.content?.split("\n").length || 0}
              </span>
              <span>
                {t("automation.characters")}: {script.content?.length || 0}
              </span>
            </div>
            <div className="text-right">
              <span className="text-gray-400">
                {t("automation.shortcuts.save")}: Ctrl+S
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              {t("automation.quickActions.format")}
            </h4>
            <p className="text-xs text-gray-500 mb-3">
              {t("automation.quickActions.formatDesc")}
            </p>
            <button
              onClick={() => {
                try {
                  if (script.language === "json") {
                    const formatted = JSON.stringify(
                      JSON.parse(script.content),
                      null,
                      2
                    );
                    onChange("content", formatted);
                  }
                } catch (error) {
                  // Invalid JSON, do nothing
                }
              }}
              disabled={script.language !== "json" || !script.content}
              className="btn btn-outline btn-xs w-full"
            >
              {t("automation.format")}
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              {t("automation.quickActions.minify")}
            </h4>
            <p className="text-xs text-gray-500 mb-3">
              {t("automation.quickActions.minifyDesc")}
            </p>
            <button
              onClick={() => {
                try {
                  if (script.language === "json") {
                    const minified = JSON.stringify(JSON.parse(script.content));
                    onChange("content", minified);
                  }
                } catch (error) {
                  // Invalid JSON, do nothing
                }
              }}
              disabled={script.language !== "json" || !script.content}
              className="btn btn-outline btn-xs w-full"
            >
              {t("automation.minify")}
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              {t("automation.quickActions.clear")}
            </h4>
            <p className="text-xs text-gray-500 mb-3">
              {t("automation.quickActions.clearDesc")}
            </p>
            <button
              onClick={() => onChange("content", "")}
              disabled={!script.content}
              className="btn btn-outline btn-xs w-full text-red-600 border-red-300 hover:bg-red-50"
            >
              {t("automation.clear")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutomationEditor;
