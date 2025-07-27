// src/components/Scripts/ScriptEditor/ScriptSidebar.js - Updated to handle API response and i18n
import React from "react";
import { useTranslation } from "react-i18next";
import {
  UserIcon,
  CalendarIcon,
  PencilIcon,
  BookOpenIcon,
  CheckIcon,
  PlayIcon,
  InformationCircleIcon,
  CodeBracketIcon,
} from "@heroicons/react/24/outline";

const ScriptSidebar = ({
  script,
  existingScript,
  isEditing,
  onShowTemplateModal,
  onValidate,
  isValidating,
  validationErrors = [],
  lastSaved,
}) => {
  const { t } = useTranslation();

  // Language reference content
  const getLanguageReference = () => {
    switch (script.language) {
      case "javascript":
        return (
          <>
            <p>{t("scripts.languageReference.javascript.accessInputData")}</p>
            <p>{t("scripts.languageReference.javascript.returnResults")}</p>
            <p>{t("scripts.languageReference.javascript.useConsoleLog")}</p>
            <p>{t("scripts.languageReference.javascript.availableObjects")}</p>
          </>
        );
      case "python":
        return (
          <>
            <p>{t("scripts.languageReference.python.accessInputData")}</p>
            <p>{t("scripts.languageReference.python.returnResults")}</p>
            <p>{t("scripts.languageReference.python.usePrint")}</p>
            <p>{t("scripts.languageReference.python.availableModules")}</p>
          </>
        );
      case "sql":
        return (
          <>
            <p>{t("scripts.languageReference.sql.useParameters")}</p>
            <p>{t("scripts.languageReference.sql.standardFunctions")}</p>
            <p>{t("scripts.languageReference.sql.resultsAsJson")}</p>
          </>
        );
      case "shell":
        return (
          <>
            <p>{t("scripts.languageReference.shell.accessParameters")}</p>
            <p>{t("scripts.languageReference.shell.useEcho")}</p>
            <p>{t("scripts.languageReference.shell.exitCodes")}</p>
          </>
        );
      default:
        return <p>{t("scripts.languageReference.languageSpecificGuidance")}</p>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Script Info */}
      {isEditing && existingScript && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            {t("scripts.sidebar.scriptInformation")}
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center text-gray-600">
              <UserIcon className="h-4 w-4 mr-2" />
              {t("scripts.sidebar.createdBy")}{" "}
              {existingScript.created_by_name || t("common.unknown")}
            </div>
            <div className="flex items-center text-gray-600">
              <CalendarIcon className="h-4 w-4 mr-2" />
              {existingScript.created_at
                ? new Date(existingScript.created_at).toLocaleDateString()
                : t("common.unknown")}
            </div>
            {existingScript.updated_at &&
              existingScript.updated_at !== existingScript.created_at && (
                <div className="flex items-center text-gray-600">
                  <PencilIcon className="h-4 w-4 mr-2" />
                  {t("common.updated")}{" "}
                  {new Date(existingScript.updated_at).toLocaleDateString()}
                </div>
              )}
            {existingScript.version && (
              <div className="flex items-center text-gray-600">
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {t("scripts.sidebar.version")} {existingScript.version}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Editor Status */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">
          {t("scripts.sidebar.editorStatus")}
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">
              {t("scripts.sidebar.linesOfCode")}
            </span>
            <span className="font-medium">
              {script.content?.split("\n").length || 0}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">
              {t("scripts.sidebar.characters")}
            </span>
            <span className="font-medium">{script.content?.length || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">
              {t("scripts.sidebar.validation")}
            </span>
            <span
              className={`font-medium ${
                validationErrors.length > 0 ? "text-red-600" : "text-green-600"
              }`}
            >
              {validationErrors.length > 0
                ? `${validationErrors.length} ${
                    validationErrors.length > 1
                      ? t("scripts.sidebar.errors")
                      : t("scripts.sidebar.error")
                  }`
                : t("scripts.sidebar.valid")}
            </span>
          </div>
          {lastSaved && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">
                {t("scripts.sidebar.lastSaved")}
              </span>
              <span className="font-medium text-green-600">
                {new Date(lastSaved).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">
          {t("scripts.sidebar.quickActions")}
        </h3>
        <div className="space-y-2">
          <button
            onClick={onShowTemplateModal}
            className="w-full inline-flex items-center px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <BookOpenIcon className="h-4 w-4 mr-2" />
            {t("scripts.sidebar.browseTemplates")}
          </button>

          <button
            onClick={onValidate}
            disabled={isValidating}
            className="w-full inline-flex items-center px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            <CheckIcon className="h-4 w-4 mr-2" />
            {isValidating
              ? t("scripts.sidebar.validating")
              : t("scripts.sidebar.validateSyntax")}
          </button>

          {isEditing && (
            <button
              onClick={() => {
                // This would trigger test functionality from parent
                // For now, it's just a visual button
              }}
              className="w-full inline-flex items-center px-3 py-2 text-sm bg-green-50 text-green-700 rounded-md hover:bg-green-100"
            >
              <PlayIcon className="h-4 w-4 mr-2" />
              {t("scripts.sidebar.testScript")}
            </button>
          )}
        </div>
      </div>

      {/* Language Reference */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">
          {script.language?.charAt(0)?.toUpperCase() +
            script.language?.slice(1)}{" "}
          {t("scripts.sidebar.languageReference")}
        </h3>
        <div className="space-y-2 text-xs text-gray-600">
          {getLanguageReference()}
        </div>
      </div>

      {/* Editor Features */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-green-900 mb-2 flex items-center">
          <CodeBracketIcon className="h-4 w-4 mr-1" />
          {t("scripts.editor.editorFeatures")}
        </h3>
        <ul className="text-xs text-green-800 space-y-1">
          <li>{t("scripts.editor.syntaxHighlighting")}</li>
          <li>{t("scripts.editor.autoCompletion")}</li>
          <li>{t("scripts.editor.errorDetection")}</li>
          <li>{t("scripts.editor.codeFolding")}</li>
          <li>{t("scripts.editor.multicursorEditing")}</li>
          <li>{t("scripts.editor.findReplace")}</li>
          <li>{t("scripts.editor.keyboardShortcutsFeature")}</li>
        </ul>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
          <InformationCircleIcon className="h-4 w-4 mr-1" />
          {t("scripts.sidebar.tips")}
        </h3>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>{t("scripts.sidebar.tipsSaveFrequently")}</li>
          <li>{t("scripts.sidebar.tipsTestWithDifferentInputs")}</li>
          <li>{t("scripts.sidebar.tipsAddParameters")}</li>
          <li>{t("scripts.sidebar.tipsUseDescriptiveNames")}</li>
          <li>{t("scripts.sidebar.tipsValidateBeforeSaving")}</li>
        </ul>
      </div>
    </div>
  );
};

export default ScriptSidebar;
