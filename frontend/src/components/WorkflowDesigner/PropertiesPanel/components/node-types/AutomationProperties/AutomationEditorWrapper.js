// src/components/WorkflowDesigner/PropertiesPanel/components/node-types/AutomationEditorWrapper.js
import React from "react";
import { useTranslation } from "react-i18next";
import { useScriptEditor } from "../../../../../../hooks/useScriptEditor";
import AutomationEditor from "../../../../../Admin/AutomationEditor/components/AutomationEditor";
import LoadingSpinner from "../../../../../Common/LoadingSpinner";

const AutomationEditorWrapper = ({ scriptId, isEditing, onClose, onSave }) => {
  const { t } = useTranslation();

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

      {/* Editor Component */}
      <AutomationEditor
        script={script}
        validationErrors={validationErrors}
        onChange={handleScriptChange}
        onValidate={handleValidate}
        isLoading={
          saveScriptMutation.isLoading || validateScriptMutation.isLoading
        }
      />

      {/* Status indicators */}
      {hasUnsavedChanges && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <svg
              className="h-4 w-4 text-yellow-400 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <span className="text-sm text-yellow-800">
              {t("automation.unsavedChanges")}
            </span>
          </div>
        </div>
      )}

      {validationErrors.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center mb-2">
            <svg
              className="h-4 w-4 text-red-400 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm font-medium text-red-800">
              {t("automation.validationErrors")}
            </span>
          </div>
          <ul className="text-sm text-red-700 space-y-1 ml-6">
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
  );
};

export default AutomationEditorWrapper;
