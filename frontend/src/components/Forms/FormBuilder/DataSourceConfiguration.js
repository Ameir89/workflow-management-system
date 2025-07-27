import {
  PlusIcon,
  TrashIcon,
  TableCellsIcon,
  LinkIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

// Updated DataSourceConfiguration.js - Key changes for index-based field updates

const DataSourceConfiguration = ({
  field,
  fieldIndex, // Add fieldIndex prop
  fields,
  updateField,
  updateLookupConfig,
  selectedLookup,
  availableLookups,
  setFields,
}) => {
  // Updated updateOption function to use fieldIndex instead of fieldId
  const updateOption = (fieldIndex, optionIndex, property, value) => {
    setFields((prevFields) => {
      const newFields = [...prevFields];
      const updatedField = { ...newFields[fieldIndex] };

      updatedField.options = updatedField.options.map((option, index) =>
        index === optionIndex ? { ...option, [property]: value } : option
      );

      newFields[fieldIndex] = updatedField;
      return newFields;
    });
  };

  // Updated addOption function to use fieldIndex instead of fieldId
  const addOption = (fieldIndex) => {
    setFields((prevFields) => {
      const newFields = [...prevFields];
      const updatedField = { ...newFields[fieldIndex] };

      updatedField.options = [
        ...updatedField.options,
        { value: "", label: "" },
      ];

      newFields[fieldIndex] = updatedField;
      return newFields;
    });
  };

  // Updated removeOption function to use fieldIndex instead of fieldId
  const removeOption = (fieldIndex, optionIndex) => {
    setFields((prevFields) => {
      const newFields = [...prevFields];
      const updatedField = { ...newFields[fieldIndex] };

      updatedField.options = updatedField.options.filter(
        (_, index) => index !== optionIndex
      );

      newFields[fieldIndex] = updatedField;
      return newFields;
    });
  };

  return (
    <div className="border-t border-gray-200 pt-4">
      <h4 className="text-md font-medium text-gray-900 mb-3">
        Data Source Configuration
      </h4>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data Source
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                value="manual"
                checked={field.dataSource === "manual"}
                onChange={
                  (e) => updateField(fieldIndex, "dataSource", e.target.value) // Use fieldIndex
                }
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-900">Manual Options</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="lookup"
                checked={field.dataSource === "lookup"}
                onChange={
                  (e) => updateField(fieldIndex, "dataSource", e.target.value) // Use fieldIndex
                }
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-900 flex items-center">
                <TableCellsIcon className="h-4 w-4 mr-1" />
                Lookup Table
              </span>
            </label>
          </div>
        </div>

        {/* Manual Options */}
        {field.dataSource === "manual" && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">
                Manual Options
              </label>
              <button
                onClick={() => addOption(fieldIndex)} // Use fieldIndex
                className="inline-flex items-center px-2 py-1 text-xs bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100"
              >
                <PlusIcon className="h-3 w-3 mr-1" />
                Add Option
              </button>
            </div>

            <div className="space-y-2">
              {field.options.map((option, optionIndex) => (
                <div key={optionIndex} className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Option Value"
                    value={option.value}
                    onChange={(e) =>
                      updateOption(
                        fieldIndex, // Use fieldIndex
                        optionIndex,
                        "value",
                        e.target.value
                      )
                    }
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Option Label"
                    value={option.label}
                    onChange={(e) =>
                      updateOption(
                        fieldIndex, // Use fieldIndex
                        optionIndex,
                        "label",
                        e.target.value
                      )
                    }
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() => removeOption(fieldIndex, optionIndex)} // Use fieldIndex
                    className="p-1 text-red-400 hover:text-red-600"
                  >
                    <TrashIcon className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lookup Configuration */}
        {field.dataSource === "lookup" && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <TableCellsIcon className="inline h-4 w-4 mr-1" />
                  Select Lookup Table *
                </label>
                <select
                  value={field.lookupTable || ""}
                  onChange={(e) => {
                    const lookupId = parseInt(e.target.value);
                    updateField(fieldIndex, "lookupTable", lookupId); // Use fieldIndex

                    // Auto-configure default fields
                    const lookup = availableLookups.find(
                      (l) => l.id === lookupId
                    );
                    if (lookup) {
                      updateLookupConfig(
                        fieldIndex, // Use fieldIndex
                        "valueField",
                        lookup.valueField
                      );
                      updateLookupConfig(
                        fieldIndex, // Use fieldIndex
                        "displayField",
                        lookup.displayField
                      );
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a lookup table...</option>
                  {availableLookups.map((lookup) => (
                    <option key={lookup.id} value={lookup.id}>
                      {lookup.displayName} ({lookup.name})
                    </option>
                  ))}
                </select>
              </div>

              {selectedLookup && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Value Field *
                        <InformationCircleIcon
                          className="inline h-3 w-3 ml-1 text-gray-400"
                          title="Field used as the actual stored value"
                        />
                      </label>
                      <select
                        value={field.lookupConfig.valueField}
                        onChange={(e) =>
                          updateLookupConfig(
                            fieldIndex, // Use fieldIndex
                            "valueField",
                            e.target.value
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      >
                        {selectedLookup.fields.map((lookupField) => (
                          <option
                            key={lookupField.name}
                            value={lookupField.name}
                          >
                            {lookupField.displayName} ({lookupField.name})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Display Field *
                        <InformationCircleIcon
                          className="inline h-3 w-3 ml-1 text-gray-400"
                          title="Field shown to users in the dropdown"
                        />
                      </label>
                      <select
                        value={field.lookupConfig.displayField}
                        onChange={(e) =>
                          updateLookupConfig(
                            fieldIndex, // Use fieldIndex
                            "displayField",
                            e.target.value
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      >
                        {selectedLookup.fields.map((lookupField) => (
                          <option
                            key={lookupField.name}
                            value={lookupField.name}
                          >
                            {lookupField.displayName} ({lookupField.name})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Fields to Include
                      <InformationCircleIcon
                        className="inline h-3 w-3 ml-1 text-gray-400"
                        title="Additional fields to include in the response data"
                      />
                    </label>
                    <div className="space-y-2">
                      {selectedLookup.fields
                        .filter(
                          (f) =>
                            f.name !== field.lookupConfig.valueField &&
                            f.name !== field.lookupConfig.displayField
                        )
                        .map((lookupField) => (
                          <label
                            key={lookupField.name}
                            className="flex items-center"
                          >
                            <input
                              type="checkbox"
                              checked={
                                field.lookupConfig.additionalFields?.includes(
                                  lookupField.name
                                ) || false
                              }
                              onChange={(e) => {
                                const currentFields =
                                  field.lookupConfig.additionalFields || [];
                                const newFields = e.target.checked
                                  ? [...currentFields, lookupField.name]
                                  : currentFields.filter(
                                      (f) => f !== lookupField.name
                                    );
                                updateLookupConfig(
                                  fieldIndex, // Use fieldIndex
                                  "additionalFields",
                                  newFields
                                );
                              }}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-900">
                              {lookupField.displayName} ({lookupField.name})
                            </span>
                          </label>
                        ))}
                    </div>
                  </div>

                  {/* ... rest of the lookup configuration remains the same */}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataSourceConfiguration;
