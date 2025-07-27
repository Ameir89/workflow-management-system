// src/pages/AutomationEditor/AutomationEditor.js
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  PlayIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  CodeBracketIcon,
  Cog6ToothIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import LoadingSpinner from "../../Common/LoadingSpinner";
import Modal from "../../Common/Modal";
import ConfirmDialog from "../../Common/ConfirmDialog";
import AutomationEditor from "./components/AutomationEditor";
import AutomationTestPanel from "./components/AutomationTestPanel";
import AutomationHistory from "./components/AutomationHistory";
import { useScriptEditor } from "../../../hooks/useScriptEditor";
import { scriptsService } from "../../../services/scriptsService";

const AutomationEditorPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { scriptId } = useParams();
  const isEditing = Boolean(scriptId);

  // State management
  const [activeTab, setActiveTab] = useState("editor");
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [testResults, setTestResults] = useState(null);

  // Hook for script management
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

  // Page title effect
  useEffect(() => {
    document.title = isEditing
      ? `${t("automation.editScript")} - ${script.name || "Untitled"}`
      : t("automation.createScript");
  }, [isEditing, script.name, t]);

  // Warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Handle save with navigation
  const handleSaveAndContinue = async () => {
    const result = await handleSave();
    if (result && !isEditing) {
      // Navigate to edit mode after creating
      navigate(`/automation/scripts/${result.script_id}/edit`, {
        replace: true,
      });
    }
  };

  // Handle test execution
  const handleTestScript = async (testData = {}) => {
    if (!scriptId) {
      toast.error(t("automation.errors.saveBeforeTest"));
      return;
    }

    try {
      setShowTestPanel(true);
      const result = await scriptsService.testScript(scriptId, testData);
      setTestResults(result);
      toast.success(t("automation.testExecuted"));
    } catch (error) {
      toast.error(error.message);
      setTestResults({ success: false, error: error.message });
    }
  };

  // Handle duplication
  const handleDuplicate = async () => {
    if (!scriptId) return;

    try {
      const newName = `${script.name} (Copy)`;
      const result = await scriptsService.duplicateScript(scriptId, newName);
      toast.success(t("automation.scriptDuplicated"));
      navigate(`/automation/scripts/${result.script_id}/edit`);
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Handle deletion
  const handleDelete = async () => {
    if (!scriptId) return;

    try {
      await scriptsService.deleteScript(scriptId);
      toast.success(t("automation.scriptDeleted"));
      navigate("/automation/scripts");
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Tab configuration
  const tabs = [
    {
      id: "editor",
      label: t("automation.tabs.editor"),
      icon: CodeBracketIcon,
    },
    {
      id: "settings",
      label: t("automation.tabs.settings"),
      icon: Cog6ToothIcon,
    },
    ...(isEditing
      ? [
          {
            id: "history",
            label: t("automation.tabs.history"),
            icon: EyeIcon,
          },
        ]
      : []),
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text={t("automation.loading")} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left side */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/automation/scripts")}
                className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                {t("common.back")}
              </button>

              <div className="border-l border-gray-300 pl-4">
                <h1 className="text-xl font-semibold text-gray-900">
                  {isEditing
                    ? script.name || "Untitled Script"
                    : t("automation.createScript")}
                </h1>
                <p className="text-sm text-gray-500">
                  {isEditing
                    ? t("automation.editingScript")
                    : t("automation.creatingScript")}
                </p>
              </div>

              {/* Status indicators */}
              <div className="flex items-center space-x-2">
                {hasUnsavedChanges && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                    <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                    {t("automation.unsavedChanges")}
                  </span>
                )}

                {validationErrors.length === 0 && script.content && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircleIcon className="h-3 w-3 mr-1" />
                    {t("automation.validated")}
                  </span>
                )}

                {validationErrors.length > 0 && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                    <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                    {t("automation.validationErrors", {
                      count: validationErrors.length,
                    })}
                  </span>
                )}
              </div>
            </div>

            {/* Right side actions */}
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

              {isEditing && (
                <>
                  <button
                    onClick={() => handleTestScript()}
                    disabled={validationErrors.length > 0}
                    className="btn btn-outline btn-sm"
                  >
                    <PlayIcon className="h-4 w-4 mr-2" />
                    {t("automation.test")}
                  </button>

                  <button
                    onClick={handleDuplicate}
                    className="btn btn-outline btn-sm"
                  >
                    <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
                    {t("automation.duplicate")}
                  </button>

                  <button
                    onClick={() => setShowDeleteDialog(true)}
                    className="btn btn-outline btn-sm text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <TrashIcon className="h-4 w-4 mr-2" />
                    {t("automation.delete")}
                  </button>
                </>
              )}

              <button
                onClick={handleSaveAndContinue}
                disabled={!script.name || saveScriptMutation.isLoading}
                className="btn btn-primary btn-sm"
              >
                {saveScriptMutation.isLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                )}
                {isEditing ? t("common.save") : t("automation.createAndEdit")}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-8 -mb-px">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center transition-colors ${
                    activeTab === tab.id
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <IconComponent className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "editor" && (
          <AutomationEditor
            script={script}
            validationErrors={validationErrors}
            onChange={handleScriptChange}
            onValidate={handleValidate}
            onTest={handleTestScript}
            isLoading={
              saveScriptMutation.isLoading || validateScriptMutation.isLoading
            }
          />
        )}

        {activeTab === "settings" && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {t("automation.scriptSettings")}
              </h3>
              {/* Settings form will be implemented in AutomationEditor component */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("automation.scriptName")}
                  </label>
                  <input
                    type="text"
                    value={script.name}
                    onChange={(e) => handleScriptChange("name", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder={t("automation.enterDescription")}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("automation.category")}
                  </label>
                  <select
                    value={script.category}
                    onChange={(e) =>
                      handleScriptChange("category", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">{t("automation.selectCategory")}</option>
                    <option value="api_call">
                      {t("automation.categories.apiCall")}
                    </option>
                    <option value="data_processing">
                      {t("automation.categories.dataProcessing")}
                    </option>
                    <option value="notification">
                      {t("automation.categories.notification")}
                    </option>
                    <option value="integration">
                      {t("automation.categories.integration")}
                    </option>
                    <option value="utility">
                      {t("automation.categories.utility")}
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("automation.language")}
                  </label>
                  <select
                    value={script.language}
                    onChange={(e) =>
                      handleScriptChange("language", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="javascript">
                      {t("automation.languages.javascript")}
                    </option>
                    <option value="python">
                      {t("automation.languages.python")}
                    </option>
                    <option value="json">
                      {t("automation.languages.json")}
                    </option>
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
              </div>
            </div>
          </div>
        )}

        {activeTab === "history" && isEditing && (
          <AutomationHistory scriptId={scriptId} />
        )}
      </div>

      {/* Test Panel Modal */}
      {showTestPanel && (
        <Modal
          isOpen={showTestPanel}
          onClose={() => setShowTestPanel(false)}
          title={t("automation.testScript")}
          maxWidth="4xl"
        >
          <AutomationTestPanel
            scriptId={scriptId}
            script={script}
            testResults={testResults}
            onTest={handleTestScript}
            onClose={() => setShowTestPanel(false)}
          />
        </Modal>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title={t("automation.deleteScript")}
        message={t("automation.deleteConfirmation", { name: script.name })}
        confirmLabel={t("common.delete")}
        variant="danger"
      />
    </div>
  );
};

export default AutomationEditorPage;
