import React, { useState } from "react";
import {
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@heroicons/react/24/outline";
import DataSourceConfiguration from "./DataSourceConfiguration";

// Updated FieldEditor.js - Key changes for index-based field updates

const FieldEditor = ({
  field,
  index,
  availableLookups,
  fieldTypes,
  fields,
  setFields,
  removeField,
  moveField,
  updateField,
  updateLookupConfig,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const selectedFieldType = fieldTypes.find(
    (type) => type.value === field.type
  );
  const selectedLookup = availableLookups.find(
    (lookup) => lookup.id === field.lookupTable
  );
  const hasLookupSupport = selectedFieldType?.hasLookup;

  // ... existing helper functions remain the same

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden transition-all duration-200">
      {/* Collapsible Header */}
      <div
        className="bg-gray-50 px-6 py-4 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors duration-150"
        onClick={toggleCollapse}
      >
        <div className="flex items-center justify-between">
          {/* ... existing header content */}

          {/* Updated Action Buttons to use index */}
          <div className="flex items-center space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                moveField(index, "up"); // Use index instead of field.id
              }}
              disabled={index === 0}
              className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
              title="Move up"
            >
              <ArrowUpIcon className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                moveField(index, "down"); // Use index instead of field.id
              }}
              disabled={index === fields.length - 1}
              className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
              title="Move down"
            >
              <ArrowDownIcon className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (
                  window.confirm(
                    `Are you sure you want to delete the field "${field.label}"?`
                  )
                ) {
                  removeField(index); // Use index instead of field.id
                }
              }}
              className="p-1.5 text-red-400 hover:text-red-600 transition-colors duration-150"
              title="Delete field"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible Content */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isCollapsed ? "max-h-0" : "max-h-[2000px]"
        }`}
      >
        <div className="p-6 space-y-4">
          {/* Updated Basic Field Properties to use index */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Field Name *
              </label>
              <input
                type="text"
                id={`field-name-${index}`} // Use index for ID
                value={field.name}
                onChange={(e) => updateField(index, "name", e.target.value)} // Use index
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-150"
                placeholder="field_name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Field Label *
              </label>
              <input
                type="text"
                id={`field-label-${index}`} // Use index for ID
                value={field.label}
                onChange={(e) => updateField(index, "label", e.target.value)} // Use index
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-150"
                placeholder="Field Label"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Field Type *
              </label>
              <select
                value={field.type}
                onChange={(e) => updateField(index, "type", e.target.value)} // Use index
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-150"
              >
                {fieldTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Placeholder
              </label>
              <input
                type="text"
                value={field.placeholder}
                onChange={
                  (e) => updateField(index, "placeholder", e.target.value) // Use index
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-150"
                placeholder="Enter placeholder text..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={field.description}
              onChange={
                (e) => updateField(index, "description", e.target.value) // Use index
              }
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-150"
              placeholder="Field description or help text..."
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={field.required}
              onChange={
                (e) => updateField(index, "required", e.target.checked) // Use index
              }
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-900">Required field</label>
          </div>

          {/* Updated Data Source Configuration to pass index */}
          {hasLookupSupport && (
            <DataSourceConfiguration
              field={field}
              fieldIndex={index} // Pass the index to DataSourceConfiguration
              fields={fields}
              setFields={setFields}
              updateField={updateField}
              updateLookupConfig={updateLookupConfig}
              selectedLookup={selectedLookup}
              availableLookups={availableLookups}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default FieldEditor;
