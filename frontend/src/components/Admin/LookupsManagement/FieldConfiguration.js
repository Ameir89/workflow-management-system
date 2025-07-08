// src/components/Admin/LookupsManagement/FieldConfiguration.js - Enhanced version
import React from "react";
import { TrashIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { getFieldTypeOptions } from "../../../utils/tableUtils";

const FieldConfiguration = ({
  fields,
  onUpdateField,
  onRemoveField,
  errors = {},
}) => {
  const fieldTypes = getFieldTypeOptions();

  if (!fields || fields.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <p>No fields configured. Add a field to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Field Header */}
      <div className="grid grid-cols-12 gap-3 text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2 bg-gray-50 rounded-lg">
        <div className="col-span-3">Field Name</div>
        <div className="col-span-3">Display Name</div>
        <div className="col-span-2">Type</div>
        <div className="col-span-1 text-center">Value</div>
        <div className="col-span-1 text-center">Display</div>
        <div className="col-span-1 text-center">Required</div>
        <div className="col-span-1 text-center">Actions</div>
      </div>

      {/* Field Rows */}
      {fields.map((field, index) => (
        <FieldRow
          key={index}
          field={field}
          index={index}
          fieldTypes={fieldTypes}
          onUpdateField={onUpdateField}
          onRemoveField={onRemoveField}
          errors={errors[index]}
          canRemove={fields.length > 1}
        />
      ))}

      {/* General Errors */}
      {errors.general && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <ExclamationCircleIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700">
              {errors.general.map((error, index) => (
                <p key={index}>{error}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Individual field row component
const FieldRow = ({
  field,
  index,
  fieldTypes,
  onUpdateField,
  onRemoveField,
  errors,
  canRemove,
}) => {
  const hasErrors = errors && errors.length > 0;

  return (
    <div
      className={`grid grid-cols-12 gap-3 items-start p-4 rounded-lg border transition-colors ${
        hasErrors
          ? "bg-red-50 border-red-200"
          : "bg-gray-50 border-gray-200 hover:bg-gray-100"
      }`}
    >
      {/* Field Name */}
      <div className="col-span-3">
        <FieldInput
          type="text"
          value={field.name}
          onChange={(value) => onUpdateField(index, "name", value)}
          placeholder="field_name"
          hasError={hasErrors}
          aria-label="Field name"
        />
      </div>

      {/* Display Name */}
      <div className="col-span-3">
        <FieldInput
          type="text"
          value={field.displayName}
          onChange={(value) => onUpdateField(index, "displayName", value)}
          placeholder="Display Name"
          hasError={hasErrors}
          aria-label="Display name"
        />
      </div>

      {/* Type */}
      <div className="col-span-2">
        <FieldSelect
          value={field.type}
          onChange={(value) => onUpdateField(index, "type", value)}
          options={fieldTypes}
          hasError={hasErrors}
          aria-label="Field type"
        />
      </div>

      {/* Value Field Checkbox */}
      <div className="col-span-1 flex justify-center">
        <FieldCheckbox
          checked={field.isValueField}
          onChange={(checked) => onUpdateField(index, "isValueField", checked)}
          color="indigo"
          aria-label="Value field"
          title="Mark as value field"
        />
      </div>

      {/* Display Field Checkbox */}
      <div className="col-span-1 flex justify-center">
        <FieldCheckbox
          checked={field.isDisplayField}
          onChange={(checked) =>
            onUpdateField(index, "isDisplayField", checked)
          }
          color="green"
          aria-label="Display field"
          title="Mark as display field"
        />
      </div>

      {/* Required Field Checkbox */}
      <div className="col-span-1 flex justify-center">
        <FieldCheckbox
          checked={field.isRequired}
          onChange={(checked) => onUpdateField(index, "isRequired", checked)}
          color="orange"
          aria-label="Required field"
          title="Mark as required field"
        />
      </div>

      {/* Remove Button */}
      <div className="col-span-1 flex justify-center">
        <button
          type="button"
          onClick={() => onRemoveField(index)}
          disabled={!canRemove}
          className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={canRemove ? "Remove field" : "Cannot remove the last field"}
          aria-label="Remove field"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Field Errors */}
      {hasErrors && (
        <div className="col-span-12 mt-2">
          <div className="text-sm text-red-600 space-y-1">
            {errors.map((error, errorIndex) => (
              <p key={errorIndex} className="flex items-center space-x-1">
                <ExclamationCircleIcon className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Reusable input component
const FieldInput = ({
  type = "text",
  value,
  onChange,
  placeholder,
  hasError,
  ...props
}) => {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:outline-none transition-colors ${
        hasError
          ? "border-red-300 focus:ring-red-500 focus:border-red-500"
          : "border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
      }`}
      {...props}
    />
  );
};

// Reusable select component
const FieldSelect = ({ value, onChange, options, hasError, ...props }) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:outline-none transition-colors ${
        hasError
          ? "border-red-300 focus:ring-red-500 focus:border-red-500"
          : "border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
      }`}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

// Reusable checkbox component
const FieldCheckbox = ({ checked, onChange, color = "indigo", ...props }) => {
  const colorClasses = {
    indigo: "text-indigo-600 focus:ring-indigo-500",
    green: "text-green-600 focus:ring-green-500",
    orange: "text-orange-600 focus:ring-orange-500",
  };

  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className={`h-4 w-4 border-gray-300 rounded focus:ring-2 focus:ring-offset-0 ${colorClasses[color]}`}
      {...props}
    />
  );
};

export default FieldConfiguration;
