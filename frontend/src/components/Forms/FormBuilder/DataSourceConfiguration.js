import {
  PlusIcon,
  TrashIcon,
  TableCellsIcon,
  LinkIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

const DataSourceConfiguration = ({
  field,
  fields,
  updateField,
  updateLookupConfig,
  selectedLookup,
  availableLookups,
  setFields,
}) => {
  const updateOption = (fieldId, optionIndex, property, value) => {
    setFields(
      fields.map((field) =>
        field.id === fieldId
          ? {
              ...field,
              options: field.options.map((option, index) =>
                index === optionIndex
                  ? { ...option, [property]: value }
                  : option
              ),
            }
          : field
      )
    );
  };

  const addOption = (fieldId) => {
    setFields(
      fields.map((field) =>
        field.id === fieldId
          ? {
              ...field,
              options: [...field.options, { value: "", label: "" }],
            }
          : field
      )
    );
  };

  const removeOption = (fieldId, optionIndex) => {
    setFields(
      fields.map((field) =>
        field.id === fieldId
          ? {
              ...field,
              options: field.options.filter(
                (_, index) => index !== optionIndex
              ),
            }
          : field
      )
    );
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
                onChange={(e) =>
                  updateField(field.id, "dataSource", e.target.value)
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
                onChange={(e) =>
                  updateField(field.id, "dataSource", e.target.value)
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
                onClick={() => addOption(field.id)}
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
                        field.id,
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
                        field.id,
                        optionIndex,
                        "label",
                        e.target.value
                      )
                    }
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() => removeOption(field.id, optionIndex)}
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
                    updateField(field.id, "lookupTable", lookupId);

                    // Auto-configure default fields
                    const lookup = availableLookups.find(
                      (l) => l.id === lookupId
                    );
                    if (lookup) {
                      updateLookupConfig(
                        field.id,
                        "valueField",
                        lookup.valueField
                      );
                      updateLookupConfig(
                        field.id,
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
                            field.id,
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
                            field.id,
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
                                  field.id,
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

                  <div className="bg-indigo-50 p-3 rounded-lg">
                    <div className="flex items-start">
                      <LinkIcon className="h-4 w-4 text-indigo-600 mt-0.5 mr-2" />
                      <div className="text-xs text-indigo-800">
                        <p className="font-medium">Lookup Configuration:</p>
                        <p>Table: {selectedLookup.displayName}</p>
                        <p>Value: {field.lookupConfig.valueField}</p>
                        <p>Display: {field.lookupConfig.displayField}</p>
                        {field.lookupConfig.additionalFields?.length > 0 && (
                          <p>
                            Additional:{" "}
                            {field.lookupConfig.additionalFields.join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
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
