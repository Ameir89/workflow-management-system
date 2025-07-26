// src/components/Scripts/ScriptEditor/ScriptBasicInfo.js - Updated to handle categories
import React from "react";

const ScriptBasicInfo = ({
  script,
  categories,
  onScriptChange,
  onTagsChange,
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">
        Basic Information
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Script Name *
          </label>
          <input
            type="text"
            value={script.name}
            onChange={(e) => onScriptChange("name", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder="Enter script name..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Language *
          </label>
          <select
            value={script.language}
            onChange={(e) => onScriptChange("language", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="sql">SQL</option>
            <option value="shell">Shell</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category *
          </label>
          <select
            value={script.category}
            onChange={(e) => onScriptChange("category", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select a category...</option>
            {Array.isArray(categories) && categories.length > 0 ? (
              categories.map((category) => (
                <option
                  key={category.category || category}
                  value={category.category || category}
                >
                  {category.category || category}
                </option>
              ))
            ) : (
              // Fallback options if categories are not loaded
              <>
                <option value="processing">Processing</option>
                <option value="validation">Validation</option>
                <option value="utility">Utility</option>
                <option value="automation">Automation</option>
              </>
            )}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            value={script.status}
            onChange={(e) => onScriptChange("status", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={script.description}
          onChange={(e) => onScriptChange("description", e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          placeholder="Describe what this script does..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tags
        </label>
        <input
          type="text"
          value={script.tags?.join(", ") || ""}
          onChange={(e) => onTagsChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          placeholder="Enter tags separated by commas..."
        />
        <p className="text-xs text-gray-500 mt-1">
          Example: validation, data-processing, utility
        </p>
      </div>
    </div>
  );
};

export default ScriptBasicInfo;
