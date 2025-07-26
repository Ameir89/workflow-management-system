// src/components/Scripts/ScriptEditor/tabs/EditorTab.js
import React, { useState } from "react";
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
        <h2 className="text-lg font-medium text-gray-900">Script Content</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <CogIcon className="h-4 w-4 mr-1" />
            Settings
          </button>

          {editorInstance && (
            <>
              <button
                onClick={formatCode}
                title="Format Code (Alt+Shift+F)"
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Format
              </button>

              <button
                onClick={openFindReplace}
                title="Find & Replace (Ctrl+H)"
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Find
              </button>
            </>
          )}

          <button
            onClick={onShowTemplateModal}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <BookOpenIcon className="h-4 w-4 mr-1" />
            Templates
          </button>

          <button
            onClick={insertExample}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <CodeBracketIcon className="h-4 w-4 mr-1" />
            Example
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="mb-4 p-4 bg-gray-50 border rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Editor Settings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Theme
              </label>
              <select
                value={editorTheme}
                onChange={(e) => setEditorTheme(e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
              >
                <option value="vs-dark">Dark</option>
                <option value="vs">Light</option>
                <option value="hc-black">High Contrast</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Language
              </label>
              <select
                value={script.language}
                onChange={(e) => onScriptChange("language", e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="sql">SQL</option>
                <option value="shell">Shell</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Font Size
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
                Close
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
                Validation Errors
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
            Keyboard Shortcuts
          </h4>
          <div className="text-xs text-blue-800 space-y-1">
            <div>
              • <kbd className="px-1 py-0.5 bg-blue-100 rounded">Ctrl+S</kbd> -
              Save script
            </div>
            <div>
              •{" "}
              <kbd className="px-1 py-0.5 bg-blue-100 rounded">Ctrl+Space</kbd>{" "}
              - Autocomplete
            </div>
            <div>
              • <kbd className="px-1 py-0.5 bg-blue-100 rounded">Ctrl+/</kbd> -
              Toggle comment
            </div>
            <div>
              • <kbd className="px-1 py-0.5 bg-blue-100 rounded">Ctrl+F</kbd> -
              Find
            </div>
            <div>
              • <kbd className="px-1 py-0.5 bg-blue-100 rounded">Ctrl+H</kbd> -
              Replace
            </div>
            <div>
              •{" "}
              <kbd className="px-1 py-0.5 bg-blue-100 rounded">Alt+Shift+F</kbd>{" "}
              - Format
            </div>
          </div>
        </div>

        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="text-sm font-medium text-green-900 mb-2">
            {script.language?.[0]?.toUpperCase() + script.language?.slice(1)}{" "}
            Tips
          </h4>
          <div className="text-xs text-green-800 space-y-1">
            {script.language === "javascript" && (
              <>
                <div>
                  • Use <code>return</code> to output results
                </div>
                <div>
                  • Access input via <code>data</code> variable
                </div>
                <div>
                  • Use <code>console.log()</code> for debugging
                </div>
              </>
            )}
            {script.language === "python" && (
              <>
                <div>
                  • Use <code>return</code> to output results
                </div>
                <div>
                  • Access input via <code>context</code> variable
                </div>
                <div>
                  • Use <code>print()</code> for debugging
                </div>
              </>
            )}
            {script.language === "sql" && (
              <>
                <div>
                  • Use <code>:parameter</code> for parameters
                </div>
                <div>• Results returned as JSON array</div>
                <div>• Standard SQL functions available</div>
              </>
            )}
            {script.language === "shell" && (
              <>
                <div>
                  • Use <code>$1, $2</code> for parameters
                </div>
                <div>
                  • Use <code>echo</code> for output
                </div>
                <div>• Exit codes: 0=success, 1+=error</div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorTab;
