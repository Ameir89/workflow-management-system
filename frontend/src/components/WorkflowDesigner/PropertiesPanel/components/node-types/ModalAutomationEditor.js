// src/components/WorkflowDesigner/PropertiesPanel/components/node-types/ModalAutomationEditor.js
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useScriptEditor } from "../../../../../hooks/useScriptEditor";
import {
  DocumentTextIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import Editor from "@monaco-editor/react";
import LoadingSpinner from "../../../../Common/LoadingSpinner";

const ModalAutomationEditor = ({ scriptId, isEditing, onClose, onSave }) => {
  const { t } = useTranslation();
  const [editorTheme, setEditorTheme] = useState("vs-light");

  const {
    script,
    validationErrors,
    hasUnsavedChanges,
    isLoading,
    handleScriptChange,
    handleSave,
    handleValidate,
    saveScriptMutation,
    validateScriptMutation,
  } = useScriptEditor(scriptId, isEditing);

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
        handleSaveAndClose();
      },
    });
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

  // Handle save and close
  const handleSaveAndClose = async () => {
    const result = await handleSave();
    if (result) {
      onSave(result);
      onClose(result);
    }
  };

  // Handle close with unsaved changes check
  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        t("automation.unsavedChangesWarning", {
          defaultValue:
            "You have unsaved changes. Are you sure you want to close?",
        })
      );
      if (!confirmed) return;
    }
    onClose();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text={t("automation.loading")} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            {isEditing ? script.name || "Edit Script" : "Create New Script"}
          </h3>
          <p className="text-sm text-gray-500">
            {isEditing
              ? t("automation.editingScript")
              : t("automation.creatingScript")}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleValidate}
            disabled={!script.content || validateScriptMutation.isLoading}
            className="btn btn-outline btn-sm"
          >
            {validateScriptMutation.isLoading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2" />
            )}
            {t("automation.validate")}
          </button>

          <button onClick={handleClose} className="btn btn-outline btn-sm">
            {t("common.cancel")}
          </button>

          <button
            onClick={handleSaveAndClose}
            disabled={!script.name || saveScriptMutation.isLoading}
            className="btn btn-primary btn-sm"
          >
            {saveScriptMutation.isLoading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            )}
            {isEditing ? t("common.save") : t("automation.createAndSave")}
          </button>
        </div>
      </div>

      {/* Script Details Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Script Details */}
        <div className="lg:col-span-1 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("automation.scriptName")}
            </label>
            <input
              type="text"
              value={script.name}
              onChange={(e) => handleScriptChange("name", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={t("automation.enterScriptName")}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("automation.description")}
            </label>
            <textarea
              value={script.description}
              onChange={(e) =>
                handleScriptChange("description", e.target.value)
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={t("automation.enterDescription")}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("automation.category")}
            </label>
            <select
              value={script.category}
              onChange={(e) => handleScriptChange("category", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{t("automation.selectCategory")}</option>
              <option value="automation">
                {t("automation.categories.automation")}
              </option>
              <option value="utility">
                {t("automation.categories.utility")}
              </option>
              <option value="transformation">
                {t("automation.categories.transformation")}
              </option>
              <option value="validation">
                {t("automation.categories.validation")}
              </option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("automation.language")}
            </label>
            <select
              value={script.language}
              onChange={(e) => handleScriptChange("language", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="javascript">
                {t("automation.languages.javascript")}
              </option>
              <option value="python">{t("automation.languages.python")}</option>
              <option value="json">{t("automation.languages.json")}</option>
            </select>
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={script.status === "active"}
                onChange={(e) =>
                  handleScriptChange(
                    "status",
                    e.target.checked ? "active" : "inactive"
                  )
                }
                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">
                {t("automation.activeScript")}
              </span>
            </label>
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
        </div>

        {/* Right Panel - Code Editor */}
        <div className="lg:col-span-2">
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
                  <option value="vs-light">
                    {t("automation.theme.light")}
                  </option>
                  <option value="vs-dark">{t("automation.theme.dark")}</option>
                  <option value="hc-black">
                    {t("automation.theme.highContrast")}
                  </option>
                </select>

                <button
                  onClick={handleValidate}
                  disabled={!script.content || validateScriptMutation.isLoading}
                  className="btn btn-outline btn-xs"
                >
                  {t("automation.validate")}
                </button>
              </div>
            </div>

            {/* Editor */}
            <div className="relative">
              {(saveScriptMutation.isLoading ||
                validateScriptMutation.isLoading) && (
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
                  onChange={(value) =>
                    handleScriptChange("content", value || "")
                  }
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
        </div>
      </div>

      {/* Status indicators */}
      {hasUnsavedChanges && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-4 w-4 text-yellow-400 mr-2" />
            <span className="text-sm text-yellow-800">
              {t("automation.unsavedChanges")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModalAutomationEditor;
