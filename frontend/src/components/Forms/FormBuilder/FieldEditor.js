import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import DataSourceConfiguration from "./DataSourceConfiguration";

const FieldEditor = ({
  field,
  index,
  availableLookups,
  fieldTypes,
  fields,
  setFields,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const removeField = (id) => {
    setFields(fields.filter((field) => field.id !== id));
  };

  const moveField = (id, direction) => {
    const index = fields.findIndex((field) => field.id === id);
    if (
      (direction === "up" && index > 0) ||
      (direction === "down" && index < fields.length - 1)
    ) {
      const newFields = [...fields];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      [newFields[index], newFields[targetIndex]] = [
        newFields[targetIndex],
        newFields[index],
      ];
      setFields(newFields);
    }
  };

  const updateField = (id, property, value) => {
    setFields(
      fields.map((field) =>
        field.id === id ? { ...field, [property]: value } : field
      )
    );
  };

  const updateLookupConfig = (id, property, value) => {
    setFields(
      fields.map((field) =>
        field.id === id
          ? {
              ...field,
              lookupConfig: { ...field.lookupConfig, [property]: value },
            }
          : field
      )
    );
  };

  const selectedFieldType = fieldTypes.find(
    (type) => type.value === field.type
  );
  const selectedLookup = availableLookups.find(
    (lookup) => lookup.id === field.lookupTable
  );
  const hasLookupSupport = selectedFieldType?.hasLookup;

  // Get field type display name
  const fieldTypeLabel = selectedFieldType?.label || field.type;

  // Get field status indicators
  const getFieldStatusIndicators = () => {
    const indicators = [];

    if (field.required) {
      indicators.push(
        <span
          key="required"
          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800"
        >
          Required
        </span>
      );
    }

    if (field.dataSource === "lookup" && field.lookupTable) {
      indicators.push(
        <span
          key="lookup"
          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
        >
          Lookup
        </span>
      );
    }

    if (field.validation && Object.values(field.validation).some((v) => v)) {
      indicators.push(
        <span
          key="validation"
          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800"
        >
          Validated
        </span>
      );
    }

    return indicators;
  };

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
          <div className="flex items-center space-x-3">
            {/* Collapse/Expand Icon */}
            <button
              type="button"
              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors duration-150"
              onClick={(e) => {
                e.stopPropagation();
                toggleCollapse();
              }}
            >
              {isCollapsed ? (
                <ChevronRightIcon className="h-4 w-4" />
              ) : (
                <ChevronDownIcon className="h-4 w-4" />
              )}
            </button>

            {/* Field Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-3">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  Field {index + 1}: {field.label || "Untitled Field"}
                </h3>
                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                  {fieldTypeLabel}
                </span>
              </div>

              {/* Field Status Indicators */}
              <div className="flex items-center space-x-2 mt-1">
                {getFieldStatusIndicators()}
                {field.description && (
                  <span className="text-xs text-gray-500 truncate max-w-xs">
                    {field.description}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                moveField(field.id, "up");
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
                moveField(field.id, "down");
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
                  removeField(field.id);
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
          {/* Basic Field Properties */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Field Name *
              </label>
              <input
                type="text"
                value={field.name}
                onChange={(e) => updateField(field.id, "name", e.target.value)}
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
                value={field.label}
                onChange={(e) => updateField(field.id, "label", e.target.value)}
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
                onChange={(e) => {
                  updateField(field.id, "type", e.target.value);
                  // Reset data source when changing field type
                  if (
                    !fieldTypes.find((type) => type.value === e.target.value)
                      ?.hasLookup
                  ) {
                    updateField(field.id, "dataSource", "manual");
                  }
                }}
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
                onChange={(e) =>
                  updateField(field.id, "placeholder", e.target.value)
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
              onChange={(e) =>
                updateField(field.id, "description", e.target.value)
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
              onChange={(e) =>
                updateField(field.id, "required", e.target.checked)
              }
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-900">Required field</label>
          </div>

          {/* Data Source Configuration for Lookup-Supported Fields */}
          {hasLookupSupport && (
            <DataSourceConfiguration
              field={field}
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
