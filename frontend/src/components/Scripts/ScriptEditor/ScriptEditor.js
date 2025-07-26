/* eslint-disable react-hooks/exhaustive-deps */
// src/components/Scripts/ScriptEditor/ScriptEditor.js - Enhanced with Monaco Editor
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  CodeBracketIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

// Custom hook and sub-components
import { useScriptEditor } from "../../../hooks/useScriptEditor";
import ScriptBasicInfo from "./ScriptBasicInfo";
import ScriptTabs from "./ScriptTabs";
import ScriptSidebar from "./ScriptSidebar";
import ScriptTemplatesModal from "./ScriptTemplatesModal";
import UnsavedChangesModal from "./UnsavedChangesModal";

const ScriptEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [activeTab, setActiveTab] = useState("editor");
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showUnsavedChanges, setShowUnsavedChanges] = useState(false);
  const [autoSave, setAutoSave] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  // Use custom hook for script management
  const {
    script,
    validationErrors,
    hasUnsavedChanges,
    isLoading,
    existingScript,
    categories,
    templates,
    saveScriptMutation,
    validateScriptMutation,
    handleScriptChange,
    handleSave,
    handleValidate,
    handleTemplateSelect,
    handleTagsChange,
    clearUnsavedChanges,
  } = useScriptEditor(id, isEditing);

  // Auto-save functionality
  useEffect(() => {
    if (autoSave && hasUnsavedChanges && isEditing) {
      const timer = setTimeout(() => {
        handleSave().then(() => {
          setLastSaved(new Date());
        });
      }, 2000); // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(timer);
    }
  }, [autoSave, hasUnsavedChanges, script.content, isEditing]);

  // Track unsaved changes for beforeunload
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

  const handleBackNavigation = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedChanges(true);
    } else {
      navigate("/scripts");
    }
  };

  const handleTemplateSelectWithModal = (template) => {
    handleTemplateSelect(template);
    setShowTemplateModal(false);
  };

  const handleSaveAndNavigate = async () => {
    const result = await handleSave();
    if (result && !isEditing) {
      navigate(`/scripts/${result.script.id}/edit`);
    }
    setLastSaved(new Date());
  };

  const handleLeaveWithoutSaving = () => {
    clearUnsavedChanges();
    navigate("/scripts");
  };

  const handleQuickValidate = async () => {
    try {
      await handleValidate();
    } catch (error) {
      console.error("Validation failed:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading script editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <button
            onClick={handleBackNavigation}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Scripts
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEditing ? "Edit Script" : "Create New Script"}
            </h1>
            <p className="text-gray-600 mt-2">
              {isEditing
                ? "Modify your existing script with VS Code-like editor"
                : "Create a reusable script with advanced code editing features"}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {/* Status indicators */}
            <div className="flex items-center space-x-2 text-sm">
              {hasUnsavedChanges && (
                <span className="text-amber-600 flex items-center">
                  <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                  Unsaved changes
                </span>
              )}

              {lastSaved && (
                <span className="text-green-600 flex items-center">
                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                  Saved {new Date(lastSaved).toLocaleTimeString()}
                </span>
              )}
            </div>

            {/* Auto-save toggle */}
            {isEditing && (
              <label className="inline-flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={autoSave}
                  onChange={(e) => setAutoSave(e.target.checked)}
                  className="mr-2 h-4 w-4 text-indigo-600 rounded"
                />
                Auto-save
              </label>
            )}

            {/* Action buttons */}
            <button
              onClick={handleQuickValidate}
              disabled={validateScriptMutation.isLoading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              {validateScriptMutation.isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
              ) : (
                <CodeBracketIcon className="h-4 w-4 mr-2" />
              )}
              Validate
            </button>

            <button
              onClick={handleSaveAndNavigate}
              disabled={saveScriptMutation.isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saveScriptMutation.isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : null}
              {isEditing ? "Update" : "Create"} Script
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Basic Information */}
          <ScriptBasicInfo
            script={script}
            categories={categories}
            onScriptChange={handleScriptChange}
            onTagsChange={handleTagsChange}
          />

          {/* Tabs with Enhanced Editor */}
          <ScriptTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            script={script}
            onScriptChange={handleScriptChange}
            validationErrors={validationErrors}
            isEditing={isEditing}
            scriptId={id}
            onShowTemplateModal={() => setShowTemplateModal(true)}
          />
        </div>

        {/* Sidebar */}
        <ScriptSidebar
          script={script}
          existingScript={existingScript}
          isEditing={isEditing}
          onShowTemplateModal={() => setShowTemplateModal(true)}
          onValidate={handleQuickValidate}
          isValidating={validateScriptMutation.isLoading}
          validationErrors={validationErrors}
          lastSaved={lastSaved}
        />
      </div>

      {/* Modals */}
      <ScriptTemplatesModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        templates={templates}
        scriptLanguage={script.language}
        onTemplateSelect={handleTemplateSelectWithModal}
      />

      <UnsavedChangesModal
        isOpen={showUnsavedChanges}
        onClose={() => setShowUnsavedChanges(false)}
        onSave={handleSaveAndNavigate}
        onLeave={handleLeaveWithoutSaving}
      />
    </div>
  );
};

export default ScriptEditor;
