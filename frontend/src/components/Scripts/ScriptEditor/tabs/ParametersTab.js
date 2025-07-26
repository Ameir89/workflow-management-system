// src/components/Scripts/ScriptEditor/tabs/ParametersTab.js
import React from "react";
import { TagIcon, TrashIcon } from "@heroicons/react/24/outline";

const ParametersTab = ({ script, onScriptChange }) => {
  const addParameter = () => {
    onScriptChange("parameters", [
      ...(script.parameters || []),
      {
        name: "",
        type: "string",
        description: "",
        required: false,
        default_value: "",
      },
    ]);
  };

  const updateParameter = (index, field, value) => {
    const updatedParameters = [...(script.parameters || [])];
    updatedParameters[index][field] = value;
    onScriptChange("parameters", updatedParameters);
  };

  const removeParameter = (index) => {
    const updatedParameters = (script.parameters || []).filter(
      (_, i) => i !== index
    );
    onScriptChange("parameters", updatedParameters);
  };

  const parameters = script.parameters || [];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900">Script Parameters</h2>
        <button
          onClick={addParameter}
          className="inline-flex items-center px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100"
        >
          <TagIcon className="h-4 w-4 mr-1" />
          Add Parameter
        </button>
      </div>

      {parameters.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <TagIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No parameters defined
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Add parameters to make your script configurable
          </p>
          <button
            onClick={addParameter}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <TagIcon className="h-4 w-4 mr-2" />
            Add First Parameter
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {parameters.map((param, index) => (
            <div
              key={index}
              className="grid grid-cols-12 gap-3 items-end p-4 bg-gray-50 rounded-lg"
            >
              <div className="col-span-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Parameter Name
                </label>
                <input
                  type="text"
                  value={param.name}
                  onChange={(e) =>
                    updateParameter(index, "name", e.target.value)
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                  placeholder="parameter_name"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={param.type}
                  onChange={(e) =>
                    updateParameter(index, "type", e.target.value)
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                  <option value="array">Array</option>
                  <option value="object">Object</option>
                </select>
              </div>
              <div className="col-span-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={param.description}
                  onChange={(e) =>
                    updateParameter(index, "description", e.target.value)
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                  placeholder="Parameter description"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Default Value
                </label>
                <input
                  type="text"
                  value={param.default_value}
                  onChange={(e) =>
                    updateParameter(index, "default_value", e.target.value)
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                  placeholder="Default"
                />
              </div>
              <div className="col-span-1">
                <label className="flex items-center text-xs text-gray-700">
                  <input
                    type="checkbox"
                    checked={param.required}
                    onChange={(e) =>
                      updateParameter(index, "required", e.target.checked)
                    }
                    className="mr-1 h-3 w-3 text-indigo-600 rounded"
                  />
                  Required
                </label>
              </div>
              <div className="col-span-1">
                <button
                  onClick={() => removeParameter(index)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ParametersTab;
