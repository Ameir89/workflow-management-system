// src/components/Scripts/ScriptEditor/ScriptSidebar.js - Updated to handle API response
import React from "react";
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
  // Language reference content
  const getLanguageReference = () => {
    switch (script.language) {
      case "javascript":
        return (
          <>
            <p>
              • Access input data via{" "}
              <code className="bg-gray-100 px-1 rounded">data</code> variable
            </p>
            <p>
              • Return results using{" "}
              <code className="bg-gray-100 px-1 rounded">return</code> statement
            </p>
            <p>
              • Use{" "}
              <code className="bg-gray-100 px-1 rounded">console.log()</code>{" "}
              for debugging
            </p>
            <p>• Available: Date, Math, JSON objects</p>
          </>
        );
      case "python":
        return (
          <>
            <p>
              • Access input data via{" "}
              <code className="bg-gray-100 px-1 rounded">context</code> variable
            </p>
            <p>
              • Return results using{" "}
              <code className="bg-gray-100 px-1 rounded">return</code> statement
            </p>
            <p>
              • Use <code className="bg-gray-100 px-1 rounded">print()</code>{" "}
              for debugging
            </p>
            <p>• Available: datetime, json, re modules</p>
          </>
        );
      case "sql":
        return (
          <>
            <p>
              • Use <code className="bg-gray-100 px-1 rounded">:parameter</code>{" "}
              for parameters
            </p>
            <p>• Standard SQL functions available</p>
            <p>• Results returned as JSON array</p>
          </>
        );
      case "shell":
        return (
          <>
            <p>
              • Access parameters via{" "}
              <code className="bg-gray-100 px-1 rounded">$1, $2, etc.</code>
            </p>
            <p>
              • Use <code className="bg-gray-100 px-1 rounded">echo</code> for
              output
            </p>
            <p>• Exit codes: 0 = success, 1+ = error</p>
          </>
        );
      default:
        return <p>• Language-specific guidance will appear here</p>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Script Info */}
      {isEditing && existingScript && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Script Information
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center text-gray-600">
              <UserIcon className="h-4 w-4 mr-2" />
              Created by {existingScript.created_by_name || "Unknown"}
            </div>
            <div className="flex items-center text-gray-600">
              <CalendarIcon className="h-4 w-4 mr-2" />
              {existingScript.created_at
                ? new Date(existingScript.created_at).toLocaleDateString()
                : "Unknown"}
            </div>
            {existingScript.updated_at &&
              existingScript.updated_at !== existingScript.created_at && (
                <div className="flex items-center text-gray-600">
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Updated{" "}
                  {new Date(existingScript.updated_at).toLocaleDateString()}
                </div>
              )}
            {existingScript.version && (
              <div className="flex items-center text-gray-600">
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                  Version {existingScript.version}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Editor Status */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">
          Editor Status
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Lines of code:</span>
            <span className="font-medium">
              {script.content?.split("\n").length || 0}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Characters:</span>
            <span className="font-medium">{script.content?.length || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Validation:</span>
            <span
              className={`font-medium ${
                validationErrors.length > 0 ? "text-red-600" : "text-green-600"
              }`}
            >
              {validationErrors.length > 0
                ? `${validationErrors.length} error${
                    validationErrors.length > 1 ? "s" : ""
                  }`
                : "Valid"}
            </span>
          </div>
          {lastSaved && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Last saved:</span>
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
          Quick Actions
        </h3>
        <div className="space-y-2">
          <button
            onClick={onShowTemplateModal}
            className="w-full inline-flex items-center px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <BookOpenIcon className="h-4 w-4 mr-2" />
            Browse Templates
          </button>

          <button
            onClick={onValidate}
            disabled={isValidating}
            className="w-full inline-flex items-center px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            <CheckIcon className="h-4 w-4 mr-2" />
            {isValidating ? "Validating..." : "Validate Syntax"}
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
              Test Script
            </button>
          )}
        </div>
      </div>

      {/* Language Reference */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">
          {script.language?.charAt(0)?.toUpperCase() +
            script.language?.slice(1)}{" "}
          Reference
        </h3>
        <div className="space-y-2 text-xs text-gray-600">
          {getLanguageReference()}
        </div>
      </div>

      {/* Editor Features */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-green-900 mb-2 flex items-center">
          <CodeBracketIcon className="h-4 w-4 mr-1" />
          Editor Features
        </h3>
        <ul className="text-xs text-green-800 space-y-1">
          <li>• Syntax highlighting</li>
          <li>• Auto-completion</li>
          <li>• Error detection</li>
          <li>• Code folding</li>
          <li>• Multi-cursor editing</li>
          <li>• Find & replace</li>
          <li>• Keyboard shortcuts</li>
        </ul>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
          <InformationCircleIcon className="h-4 w-4 mr-1" />
          Tips
        </h3>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• Save frequently to avoid losing changes</li>
          <li>• Test your script with different inputs</li>
          <li>• Add parameters for reusability</li>
          <li>• Use descriptive names and comments</li>
          <li>• Validate syntax before saving</li>
        </ul>
      </div>
    </div>
  );
};

export default ScriptSidebar;
