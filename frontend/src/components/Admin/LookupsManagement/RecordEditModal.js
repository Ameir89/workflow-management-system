// src/components/Admin/LookupsManagement/RecordEditModal.js
import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "react-query";
import { toast } from "react-toastify";
import { lookupsService } from "../../../services/lookupsService";
import Modal from "../../Common/Modal";

const RecordEditModal = ({ isOpen, onClose, selectedTable, editingRecord }) => {
  const queryClient = useQueryClient();
  const [recordData, setRecordData] = useState({});

  useEffect(() => {
    if (editingRecord) {
      setRecordData(editingRecord);
    }
  }, [editingRecord]);

  // Create record mutation
  const createRecordMutation = useMutation(
    ({ tableId, recordData }) =>
      lookupsService.createLookupRecord(tableId, recordData),
    {
      onSuccess: () => {
        toast.success("Record created successfully");
        queryClient.invalidateQueries(["lookup-table-data", selectedTable?.id]);
        onClose();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create record");
      },
    }
  );

  // Update record mutation
  const updateRecordMutation = useMutation(
    ({ tableId, recordId, recordData }) =>
      lookupsService.updateLookupRecord(tableId, recordId, recordData),
    {
      onSuccess: () => {
        toast.success("Record updated successfully");
        queryClient.invalidateQueries(["lookup-table-data", selectedTable?.id]);
        onClose();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update record");
      },
    }
  );

  const handleFieldChange = (fieldName, value) => {
    setRecordData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedTable?.id) {
      toast.error("No table selected");
      return;
    }

    if (recordData.id) {
      // Update existing record
      updateRecordMutation.mutate({
        tableId: selectedTable.id,
        recordId: recordData.id,
        recordData: recordData,
      });
    } else {
      // Create new record
      createRecordMutation.mutate({
        tableId: selectedTable.id,
        recordData: recordData,
      });
    }
  };

  const isEditing = recordData.id;
  const isLoading =
    createRecordMutation.isLoading || updateRecordMutation.isLoading;

  if (!selectedTable || !selectedTable.fields) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${isEditing ? "Edit" : "Add New"} Record`}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit}>
        <div className="p-6">
          <div className="space-y-4">
            {selectedTable.fields.map((field) => (
              <FieldInput
                key={field.name}
                field={field}
                value={recordData[field.name] || ""}
                onChange={(value) => handleFieldChange(field.name, value)}
              />
            ))}
          </div>
        </div>

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
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : null}
            {isEditing ? "Update Record" : "Create Record"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const FieldInput = ({ field, value, onChange }) => {
  const renderInput = () => {
    switch (field.type) {
      case "boolean":
        return (
          <select
            value={value === true ? "true" : value === false ? "false" : ""}
            onChange={(e) => {
              const val = e.target.value;
              onChange(val === "" ? null : val === "true");
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            required={field.isRequired}
          >
            <option value="">Select...</option>
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        );

      case "number":
        return (
          <input
            type="number"
            value={value}
            onChange={(e) =>
              onChange(e.target.value ? Number(e.target.value) : "")
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder={`Enter ${field.displayName || field.name}`}
            required={field.isRequired}
          />
        );

      case "date":
        return (
          <input
            type="date"
            value={value ? new Date(value).toISOString().split("T")[0] : ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            required={field.isRequired}
          />
        );

      default: // text
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder={`Enter ${field.displayName || field.name}`}
            required={field.isRequired}
          />
        );
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {field.displayName || field.name}
        {field.isRequired && <span className="text-red-500 ml-1">*</span>}
        {field.isValueField && <span className="text-indigo-500 ml-1">•</span>}
        {field.isDisplayField && <span className="text-green-500 ml-1">•</span>}
      </label>
      {renderInput()}
      {field.description && (
        <p className="mt-1 text-xs text-gray-500">{field.description}</p>
      )}
    </div>
  );
};

export default RecordEditModal;
