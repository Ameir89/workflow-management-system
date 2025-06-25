// src/components/Admin/LookupsManagement/CreateTableModal.js
import React, { useState, useEffect } from "react";
import { PlusIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Modal from "../../Common/Modal";
import FieldConfiguration from "./FieldConfiguration";

const CreateTableModal = ({
  isOpen,
  onClose,
  selectedTable,
  onSubmit,
  isLoading,
}) => {
  const [tableName, setTableName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState([
    {
      name: "id",
      type: "number",
      displayName: "ID",
      isValueField: true,
      isDisplayField: false,
    },
    {
      name: "name",
      type: "text",
      displayName: "Name",
      isValueField: false,
      isDisplayField: true,
    },
  ]);

  // Reset form when modal opens/closes or selectedTable changes
  useEffect(() => {
    if (isOpen) {
      if (selectedTable) {
        setTableName(selectedTable.name || "");
        setDisplayName(selectedTable.displayName || "");
        setDescription(selectedTable.description || "");
        setFields(selectedTable.fields || getDefaultFields());
      } else {
        resetForm();
      }
    }
  }, [isOpen, selectedTable]);

  const resetForm = () => {
    setTableName("");
    setDisplayName("");
    setDescription("");
    setFields(getDefaultFields());
  };

  const getDefaultFields = () => [
    {
      name: "id",
      type: "number",
      displayName: "ID",
      isValueField: true,
      isDisplayField: false,
    },
    {
      name: "name",
      type: "text",
      displayName: "Name",
      isValueField: false,
      isDisplayField: true,
    },
  ];

  const addField = () => {
    setFields([
      ...fields,
      {
        name: "",
        type: "text",
        displayName: "",
        isValueField: false,
        isDisplayField: false,
      },
    ]);
  };

  const removeField = (index) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (index, field, value) => {
    const updatedFields = [...fields];
    updatedFields[index][field] = value;
    setFields(updatedFields);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const tableData = {
      name: tableName,
      displayName,
      description,
      fields,
      isActive: true,
    };

    onSubmit(tableData);
  };

  const isValid = tableName && displayName && fields.length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${selectedTable ? "Edit" : "Create"} Lookup Table`}
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit}>
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Table Name *
              </label>
              <input
                type="text"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., countries"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Name *
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., Countries"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="Describe what this lookup table contains..."
            />
          </div>

          {/* Fields Configuration */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-medium text-gray-900">
                Fields Configuration
              </h4>
              <button
                type="button"
                onClick={addField}
                className="inline-flex items-center px-3 py-2 text-sm bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Field
              </button>
            </div>

            <FieldConfiguration
              fields={fields}
              onUpdateField={updateField}
              onRemoveField={removeField}
            />

            <div className="mt-3 text-xs text-gray-500">
              <p>
                <span className="text-indigo-600">*</span> Value field: Used as
                the actual value stored in forms
              </p>
              <p>
                <span className="text-green-600">•</span> Display field: Shown
                to users in dropdowns
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center"
            disabled={!isValid || isLoading}
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : null}
            {selectedTable ? "Update Table" : "Create Table"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateTableModal;
