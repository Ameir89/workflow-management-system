import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "react-query";
import { toast } from "react-toastify";
import { lookupsService } from "../../../services/lookupsService";
import Modal from "../../Common/Modal";
import FieldInput from "./FieldInput";

const RecordEditModal = ({ isOpen, onClose, selectedTable, editingRecord }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [recordData, setRecordData] = useState({});

  useEffect(() => {
    if (editingRecord && editingRecord.id) {
      // For existing records, flatten the data structure
      setRecordData({
        id: editingRecord.id,
        ...(editingRecord.data || editingRecord), // Handle both nested and flat data
      });
    } else {
      // For new records, initialize empty
      setRecordData({});
    }
  }, [editingRecord]);

  // Create record mutation
  const createRecordMutation = useMutation(
    ({ tableId, recordData }) =>
      lookupsService.createLookupRecord(tableId, recordData),
    {
      onSuccess: () => {
        toast.success(t("admin.lookups.recordCreated"));
        queryClient.invalidateQueries(["lookup-table-data", selectedTable?.id]);
        onClose();
      },
      onError: (error) => {
        toast.error(error.message || t("admin.lookups.recordCreateFailed"));
      },
    }
  );

  // Update record mutation
  const updateRecordMutation = useMutation(
    ({ tableId, recordId, recordData }) =>
      lookupsService.updateLookupRecord(tableId, recordId, recordData),
    {
      onSuccess: () => {
        toast.success(t("admin.lookups.recordUpdated"));
        queryClient.invalidateQueries(["lookup-table-data", selectedTable?.id]);
        onClose();
      },
      onError: (error) => {
        toast.error(error.message || t("admin.lookups.recordUpdateFailed"));
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
      toast.error(t("admin.lookups.noTableSelected"));
      return;
    }

    // Prepare data for API (exclude metadata fields)
    const { id, _metadata, ...dataFields } = recordData;

    if (id && id !== "new") {
      // Update existing record
      updateRecordMutation.mutate({
        tableId: selectedTable.id,
        recordId: id,
        recordData: dataFields,
      });
    } else {
      // Create new record
      createRecordMutation.mutate({
        tableId: selectedTable.id,
        recordData: dataFields,
      });
    }
  };

  const isEditing = recordData.id && recordData.id !== "new";
  const isLoading =
    createRecordMutation.isLoading || updateRecordMutation.isLoading;

  if (!selectedTable || !selectedTable.additional_fields) {
    return null;
  }

  // Get all fields including the special value and display fields
  const allFields = [
    selectedTable.value_field,
    selectedTable.display_field,
    ...selectedTable.additional_fields.filter(
      (field) =>
        field !== selectedTable.value_field &&
        field !== selectedTable.display_field
    ),
  ].filter(Boolean);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${isEditing ? t("common.edit") : t("admin.lookups.addNew")} ${t(
        "admin.lookups.record"
      )}`}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit}>
        <div className="p-6">
          <div className="space-y-4">
            {allFields.map((fieldName) => (
              <FieldInput
                key={fieldName}
                fieldName={fieldName}
                fieldLabel={
                  fieldName.charAt(0).toUpperCase() +
                  fieldName.slice(1).replace(/_/g, " ")
                }
                value={recordData[fieldName] || ""}
                onChange={(value) => handleFieldChange(fieldName, value)}
                isRequired={
                  fieldName === selectedTable.value_field ||
                  fieldName === selectedTable.display_field
                }
                isValueField={fieldName === selectedTable.value_field}
                isDisplayField={fieldName === selectedTable.display_field}
                t={t}
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
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : null}
            {isEditing ? t("common.update") : t("common.create")}{" "}
            {t("admin.lookups.record")}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default RecordEditModal;
