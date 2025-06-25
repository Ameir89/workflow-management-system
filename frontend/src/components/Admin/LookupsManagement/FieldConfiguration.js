// src/components/Admin/LookupsManagement/FieldConfiguration.js
import React from "react";
import { TrashIcon } from "@heroicons/react/24/outline";

const FieldConfiguration = ({ fields, onUpdateField, onRemoveField }) => {
  const fieldTypes = [
    { value: "text", label: "Text" },
    { value: "number", label: "Number" },
    { value: "date", label: "Date" },
    { value: "boolean", label: "Boolean" },
  ];

  return (
    <div className="space-y-3">
      {fields.map((field, index) => (
        <div
          key={index}
          className="grid grid-cols-12 gap-3 items-end p-4 bg-gray-50 rounded-lg"
        >
          {/* Field Name */}
          <div className="col-span-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Field Name
            </label>
            <input
              type="text"
              value={field.name}
              onChange={(e) => onUpdateField(index, "name", e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
              placeholder="field_name"
            />
          </div>

          {/* Display Name */}
          <div className="col-span-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={field.displayName}
              onChange={(e) =>
                onUpdateField(index, "displayName", e.target.value)
              }
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
              placeholder="Display Name"
            />
          </div>

          {/* Type */}
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={field.type}
              onChange={(e) => onUpdateField(index, "type", e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
            >
              {fieldTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Value Field Checkbox */}
          <div className="col-span-1 flex justify-center">
            <div className="text-center">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Value
              </label>
              <input
                type="checkbox"
                checked={field.isValueField}
                onChange={(e) =>
                  onUpdateField(index, "isValueField", e.target.checked)
                }
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Display Field Checkbox */}
          <div className="col-span-1 flex justify-center">
            <div className="text-center">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Display
              </label>
              <input
                type="checkbox"
                checked={field.isDisplayField}
                onChange={(e) =>
                  onUpdateField(index, "isDisplayField", e.target.checked)
                }
                className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
            </div>
          </div>

          {/* Required Field Checkbox */}
          <div className="col-span-1 flex justify-center">
            <div className="text-center">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Required
              </label>
              <input
                type="checkbox"
                checked={field.isRequired || false}
                onChange={(e) =>
                  onUpdateField(index, "isRequired", e.target.checked)
                }
                className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Remove Button */}
          <div className="col-span-1 flex justify-center">
            <button
              type="button"
              onClick={() => onRemoveField(index)}
              className="p-1 text-red-600 hover:bg-red-50 rounded"
              title="Remove field"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}

      {fields.length === 0 && (
        <div className="text-center py-4 text-gray-500">
          No fields configured. Add a field to get started.
        </div>
      )}
    </div>
  );
};

export default FieldConfiguration;
