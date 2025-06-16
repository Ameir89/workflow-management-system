import {
  ArrowDownIcon,
  ArrowUpIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import DataSourceConfiguration from "./DataSourceConfiguration";

const FieldEditor = ({
  field,
  index,
  availableLookups,
  fieldTypes,
  fields,

  setFields,
}) => {
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

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      {/* Field Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Field {index + 1}: {field.label}
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => moveField(field.id, "up")}
            disabled={index === 0}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <ArrowUpIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => moveField(field.id, "down")}
            disabled={index === fields.length - 1}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <ArrowDownIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => removeField(field.id)}
            className="p-1 text-red-400 hover:text-red-600"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
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
          onChange={(e) => updateField(field.id, "description", e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          placeholder="Field description or help text..."
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          checked={field.required}
          onChange={(e) => updateField(field.id, "required", e.target.checked)}
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
  );
};

export default FieldEditor;
