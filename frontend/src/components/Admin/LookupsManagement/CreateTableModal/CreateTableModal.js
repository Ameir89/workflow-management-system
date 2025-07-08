// src/components/Admin/LookupsManagement/CreateTableModal/CreateTableModal.js - Simplified for API structure
import React, { useState, useEffect, useCallback } from "react";
import { useLookups } from "../../../../hooks/useLookups";
import Modal from "../../../Common/Modal";
import {
  validateTableData,
  formatTableDataForAPI,
} from "../../../../utils/tableUtils";

const CreateTableModal = ({ isOpen, onClose, selectedTable }) => {
  // Form state - simplified to match API structure
  const [formData, setFormData] = useState({
    tableName: "",
    displayName: "",
    description: "",
    value_field: "",
    display_field: "",
    additional_fields: [""],
  });
  const [errors, setErrors] = useState({});

  // Hooks
  const { useCreateTableMutation, useUpdateTableMutation } = useLookups();

  const createTableMutation = useCreateTableMutation({
    onSuccess: () => {
      resetForm();
      onClose();
    },
  });

  const updateTableMutation = useUpdateTableMutation({
    onSuccess: () => {
      resetForm();
      onClose();
    },
  });

  // Reset form when modal opens/closes or selectedTable changes
  useEffect(() => {
    if (isOpen) {
      if (selectedTable) {
        setFormData({
          tableName: selectedTable.name || "",
          displayName: selectedTable.display_name || "",
          description: selectedTable.description || "",
          value_field: selectedTable.value_field || "",
          display_field: selectedTable.display_field || "",
          additional_fields: selectedTable.additional_fields || [""],
        });
      } else {
        resetForm();
      }
      setErrors({});
    }
  }, [isOpen, selectedTable]);

  // Form handlers
  const resetForm = useCallback(() => {
    setFormData({
      tableName: "",
      displayName: "",
      description: "",
      value_field: "",
      display_field: "",
      additional_fields: [""],
    });
    setErrors({});
  }, []);

  const updateFormData = useCallback(
    (field, value) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      // Clear error for this field when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: null }));
      }
    },
    [errors]
  );

  const addAdditionalField = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      additional_fields: [...prev.additional_fields, ""],
    }));
  }, []);

  const removeAdditionalField = useCallback((index) => {
    setFormData((prev) => ({
      ...prev,
      additional_fields: prev.additional_fields.filter((_, i) => i !== index),
    }));
  }, []);

  const updateAdditionalField = useCallback((index, value) => {
    setFormData((prev) => ({
      ...prev,
      additional_fields: prev.additional_fields.map((field, i) =>
        i === index ? value : field
      ),
    }));
  }, []);

  // Validation and submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Filter out empty additional fields
    const cleanedFormData = {
      ...formData,
      additional_fields: formData.additional_fields.filter((field) =>
        field.trim()
      ),
    };

    const validation = validateTableData(cleanedFormData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    const tableData = formatTableDataForAPI(cleanedFormData);

    try {
      if (selectedTable?.id) {
        await updateTableMutation.mutateAsync({
          id: selectedTable.id,
          data: tableData,
        });
      } else {
        await createTableMutation.mutateAsync(tableData);
      }
    } catch (error) {
      console.error("Failed to save table:", error);
    }
  };

  const isLoading =
    createTableMutation.isLoading || updateTableMutation.isLoading;
  const isEditMode = Boolean(selectedTable?.id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${isEditMode ? "Edit" : "Create"} Lookup Table`}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit}>
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">
              Basic Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Table Name" required error={errors.tableName}>
                <input
                  type="text"
                  value={formData.tableName}
                  onChange={(e) => updateFormData("tableName", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., countries"
                />
              </FormField>

              <FormField
                label="Display Name"
                required
                error={errors.displayName}
              >
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) =>
                    updateFormData("displayName", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Countries"
                />
              </FormField>

              <div className="md:col-span-2">
                <FormField label="Description" error={errors.description}>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      updateFormData("description", e.target.value)
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Describe what this lookup table contains..."
                  />
                </FormField>
              </div>
            </div>
          </div>

          {/* Field Configuration */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">
              Field Configuration
            </h4>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="Value Field"
                  required
                  error={errors.value_field}
                >
                  <input
                    type="text"
                    value={formData.value_field}
                    onChange={(e) =>
                      updateFormData("value_field", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., code"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    The field used as the actual value stored in forms
                  </p>
                </FormField>

                <FormField
                  label="Display Field"
                  required
                  error={errors.display_field}
                >
                  <input
                    type="text"
                    value={formData.display_field}
                    onChange={(e) =>
                      updateFormData("display_field", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., name"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    The field shown to users in dropdowns
                  </p>
                </FormField>
              </div>

              {/* Additional Fields */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Additional Fields
                    {errors.additional_fields && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </label>
                  <button
                    type="button"
                    onClick={addAdditionalField}
                    className="inline-flex items-center px-3 py-1 text-sm bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    + Add Field
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.additional_fields.map((field, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={field}
                        onChange={(e) =>
                          updateAdditionalField(index, e.target.value)
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder={`Additional field ${index + 1}`}
                      />
                      {formData.additional_fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeAdditionalField(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {errors.additional_fields && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.additional_fields}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Additional data fields that will be stored with each record
                </p>
              </div>
            </div>
          </div>

          {/* Example Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h5 className="font-medium text-blue-900 mb-2">Preview</h5>
            <div className="text-sm text-blue-800">
              <p>
                <strong>Value Field:</strong>{" "}
                {formData.value_field || "Not specified"}
              </p>
              <p>
                <strong>Display Field:</strong>{" "}
                {formData.display_field || "Not specified"}
              </p>
              <p>
                <strong>Additional Fields:</strong>{" "}
                {formData.additional_fields
                  .filter((f) => f.trim())
                  .join(", ") || "None"}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center transition-colors"
            disabled={
              !formData.tableName ||
              !formData.displayName ||
              !formData.value_field ||
              !formData.display_field ||
              isLoading
            }
          >
            {isLoading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            )}
            {isEditMode ? "Update Table" : "Create Table"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// Form field wrapper component
const FormField = ({ label, required, error, children }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default CreateTableModal;
