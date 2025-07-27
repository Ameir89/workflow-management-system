// src/components/Scripts/ScriptEditor/tabs/EditorTab.js
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpenIcon,
  CodeBracketIcon,
  ExclamationTriangleIcon,
  CogIcon,
} from "@heroicons/react/24/outline";
import MonacoReactEditor from "../MonacoReactEditor";
import {
  JAVASCRIPT_EXAMPLE,
  PYTHON_EXAMPLE,
  SQL_EXAMPLE,
  SHELL_EXAMPLE,
} from "../../../../consts/CodeExamples";

const EditorTab = ({
  script,
  onScriptChange,
  validationErrors = [],
  onShowTemplateModal,
}) => {
  const { t } = useTranslation();
  const [editorTheme, setEditorTheme] = useState("vs-dark");
  const [showSettings, setShowSettings] = useState(false);
  const [editorInstance, setEditorInstance] = useState(null);

  const getCodeExample = (language) => {
    switch (language) {
      case "javascript":
        return JAVASCRIPT_EXAMPLE;
      case "python":
        return PYTHON_EXAMPLE;
      case "sql":
        return SQL_EXAMPLE;
      case "shell":
        return SHELL_EXAMPLE;
      default:
        return JAVASCRIPT_EXAMPLE;
    }
  };

  const handleEditorMount = (editor, monaco) => {
    setEditorInstance(editor);
  };

  const handleEditorError = (error) => {
    console.error("Monaco editor error:", error);
  };

  const formatCode = () => {
    if (editorInstance) {
      editorInstance.getAction("editor.action.formatDocument")?.run();
    }
  };

  const openFindReplace = () => {
    if (editorInstance) {
      editorInstance.getAction("editor.action.startFindReplaceAction")?.run();
    }
  };

  const insertExample = () => {
    const example = getCodeExample(script.language);
    onScriptChange("content", example);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900">
          {t("scripts.content")}
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <CogIcon className="h-4 w-4 mr-1" />
            {t("scripts.editor.settings")}
          </button>

          {editorInstance && (
            <>
              <button
                onClick={formatCode}
                title={t("scripts.editor.formatCode")}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                {t("scripts.editor.format")}
              </button>

              <button
                onClick={openFindReplace}
                title={t("scripts.editor.openFindReplace")}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                {t("scripts.editor.find")}
              </button>
            </>
          )}

          <button
            onClick={onShowTemplateModal}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <BookOpenIcon className="h-4 w-4 mr-1" />
            {t("scripts.editor.templates")}
          </button>

          <button
            onClick={insertExample}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <CodeBracketIcon className="h-4 w-4 mr-1" />
            {t("scripts.editor.example")}
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="mb-4 p-4 bg-gray-50 border rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            {t("scripts.editor.settingsTitle")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t("scripts.editor.theme")}
              </label>
              <select
                value={editorTheme}
                onChange={(e) => setEditorTheme(e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
              >
                <option value="vs-dark">{t("common.dark")}</option>
                <option value="vs">{t("common.light")}</option>
                <option value="hc-black">{t("common.highContrast")}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t("scripts.language")}
              </label>
              <select
                value={script.language}
                onChange={(e) => onScriptChange("language", e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
              >
                <option value="javascript">
                  {t("scripts.languages.javascript")}
                </option>
                <option value="python">{t("scripts.languages.python")}</option>
                <option value="sql">{t("scripts.languages.sql")}</option>
                <option value="shell">{t("scripts.languages.shell")}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t("scripts.editor.fontSize")}
              </label>
              <select
                defaultValue="14"
                onChange={(e) =>
                  editorInstance?.updateOptions({
                    fontSize: parseInt(e.target.value),
                  })
                }
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
              >
                <option value="12">12px</option>
                <option value="14">14px</option>
                <option value="16">16px</option>
                <option value="18">18px</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => setShowSettings(false)}
                className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
              >
                {t("scripts.editor.close")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4">
        <MonacoReactEditor
          value={script.content}
          onChange={(value) => onScriptChange("content", value)}
          language={script.language}
          theme={editorTheme}
          height={500}
          onMount={handleEditorMount}
          onError={handleEditorError}
          validationErrors={validationErrors}
        />
      </div>

      {validationErrors.length > 0 && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
            <div>
              <h4 className="text-sm font-medium text-red-800">
                {t("scripts.validation.validationErrors")}
              </h4>
              <ul className="mt-2 text-sm text-red-700 space-y-1">
                {validationErrors.map((err, i) => (
                  <li key={i}>• {err}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            {t("scripts.editor.keyboardShortcuts")}
          </h4>
          <div className="text-xs text-blue-800 space-y-1">
            <div>
              •{" "}
              <kbd className="px-1 py-0.5 bg-blue-100 rounded">
                {t("scripts.keyboardShortcuts.ctrlS")}
              </kbd>{" "}
              -{t("scripts.keyboardShortcuts.saveScript")}
            </div>
            <div>
              •{" "}
              <kbd className="px-1 py-0.5 bg-blue-100 rounded">
                {t("scripts.keyboardShortcuts.ctrlSpace")}
              </kbd>{" "}
              - {t("scripts.keyboardShortcuts.autocomplete")}
            </div>
            <div>
              •{" "}
              <kbd className="px-1 py-0.5 bg-blue-100 rounded">
                {t("scripts.keyboardShortcuts.ctrlSlash")}
              </kbd>{" "}
              -{t("scripts.keyboardShortcuts.toggleComment")}
            </div>
            <div>
              •{" "}
              <kbd className="px-1 py-0.5 bg-blue-100 rounded">
                {t("scripts.keyboardShortcuts.ctrlF")}
              </kbd>{" "}
              -{t("scripts.keyboardShortcuts.find")}
            </div>
            <div>
              •{" "}
              <kbd className="px-1 py-0.5 bg-blue-100 rounded">
                {t("scripts.keyboardShortcuts.ctrlH")}
              </kbd>{" "}
              -{t("scripts.keyboardShortcuts.replace")}
            </div>
            <div>
              •{" "}
              <kbd className="px-1 py-0.5 bg-blue-100 rounded">
                {t("scripts.keyboardShortcuts.altShiftF")}
              </kbd>{" "}
              - {t("scripts.keyboardShortcuts.format")}
            </div>
          </div>
        </div>

        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="text-sm font-medium text-green-900 mb-2">
            {script.language?.[0]?.toUpperCase() + script.language?.slice(1)}{" "}
            {t("scripts.sidebar.tips")}
          </h4>
          <div className="text-xs text-green-800 space-y-1">
            {script.language === "javascript" && (
              <>
                <div>{t("scripts.editorTips.javascript.useReturn")}</div>
                <div>
                  {t("scripts.editorTips.javascript.accessInputViaData")}
                </div>
                <div>
                  {t("scripts.editorTips.javascript.useConsoleLogForDebugging")}
                </div>
              </>
            )}
            {script.language === "python" && (
              <>
                <div>{t("scripts.editorTips.python.useReturn")}</div>
                <div>
                  {t("scripts.editorTips.python.accessInputViaContext")}
                </div>
                <div>{t("scripts.editorTips.python.usePrintForDebugging")}</div>
              </>
            )}
            {script.language === "sql" && (
              <>
                <div>
                  {t("scripts.editorTips.sql.useParameterForParameters")}
                </div>
                <div>
                  {t("scripts.editorTips.sql.resultsReturnedAsJsonArray")}
                </div>
                <div>
                  {t("scripts.editorTips.sql.standardSqlFunctionsAvailable")}
                </div>
              </>
            )}
            {script.language === "shell" && (
              <>
                <div>
                  {t("scripts.editorTips.shell.useParametersForParameters")}
                </div>
                <div>{t("scripts.editorTips.shell.useEchoForOutput")}</div>
                <div>{t("scripts.editorTips.shell.exitCodesSuccessError")}</div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorTab;
