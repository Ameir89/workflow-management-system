import React, { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import FileUploadArea from "./FileUploadArea";
import { useLookups } from "../../../../hooks/useLookups";
import Modal from "../../../Common/Modal";
import FieldMappingPreview from "./FieldMappingPreview";

const ImportModal = ({ isOpen, onClose, selectedTable }) => {
  const { t } = useTranslation();
  const [csvFile, setCsvFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [validationResults, setValidationResults] = useState(null);

  // Hooks
  const { useImportDataMutation } = useLookups();
  const importMutation = useImportDataMutation(selectedTable?.id, {
    onSuccess: () => {
      handleClose();
    },
  });
  const validateCSV = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const lines = content.split("\n");
      const headers = lines[0]
        ?.split(",")
        .map((h) => h.trim().replace(/"/g, ""));

      setValidationResults({
        totalLines: lines.length - 1,
        headers: headers,
        fileSize: (file.size / 1024).toFixed(2) + " KB",
        isValid: headers && headers.length > 0,
      });
    };
    reader.readAsText(file);
  }, []);

  // File handling
  const handleFileSelect = useCallback(
    (file) => {
      if (file) {
        if (file.type === "text/csv" || file.name.endsWith(".csv")) {
          setCsvFile(file);
          setValidationResults(null);
          validateCSV(file);
        } else {
          alert(t("admin.lookups.selectValidCSV"));
        }
      }
    },
    [t, validateCSV]
  );

  // Drag and drop handlers
  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  // Import handler
  const handleImport = useCallback(() => {
    if (csvFile && selectedTable?.id) {
      importMutation.mutate(csvFile);
    }
  }, [csvFile, selectedTable?.id, importMutation]);

  // Modal close handler
  const handleClose = useCallback(() => {
    setCsvFile(null);
    setDragOver(false);
    setValidationResults(null);
    onClose();
  }, [onClose]);

  // Get table fields for mapping preview
  const getTableFields = () => {
    if (!selectedTable) return [];

    return [
      {
        name: selectedTable.value_field,
        displayName:
          selectedTable.value_field?.charAt(0).toUpperCase() +
          selectedTable.value_field?.slice(1).replace(/_/g, " "),
        isRequired: true,
        isValueField: true,
      },
      {
        name: selectedTable.display_field,
        displayName:
          selectedTable.display_field?.charAt(0).toUpperCase() +
          selectedTable.display_field?.slice(1).replace(/_/g, " "),
        isRequired: true,
        isDisplayField: true,
      },
      ...(selectedTable.additional_fields || []).map((field) => ({
        name: field,
        displayName:
          field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, " "),
        isRequired: false,
      })),
    ].filter((field) => field.name);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t("admin.lookups.importCSVData")}
      maxWidth="lg"
    >
      <div className="p-6 space-y-6">
        {/* File Upload Area */}
        <FileUploadArea
          csvFile={csvFile}
          dragOver={dragOver}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onFileSelect={handleFileSelect}
          onRemoveFile={() => {
            setCsvFile(null);
            setValidationResults(null);
          }}
          validationResults={validationResults}
        />

        {/* Field Mapping Preview */}
        {csvFile && validationResults && selectedTable && (
          <FieldMappingPreview
            tableFields={getTableFields()}
            csvHeaders={validationResults.headers}
          />
        )}

        {/* Import Guidelines */}
        <ImportGuidelines />
      </div>

      {/* Modal Footer */}
      <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
        <button
          onClick={handleClose}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          disabled={importMutation.isLoading}
        >
          {t("common.cancel")}
        </button>
        <button
          onClick={handleImport}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center transition-colors"
          disabled={!csvFile || importMutation.isLoading}
        >
          {importMutation.isLoading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
          )}
          {t("admin.lookups.importData")}
        </button>
      </div>
    </Modal>
  );
};

// Import guidelines component
const ImportGuidelines = () => {
  const { t } = useTranslation();

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h4 className="font-medium text-blue-900 mb-2">
        {t("admin.lookups.importGuidelines")}:
      </h4>
      <ul className="text-sm text-blue-800 space-y-1">
        <li>• {t("admin.lookups.firstRowHeaders")}</li>
        <li>• {t("admin.lookups.columnsShouldMatch")}</li>
        <li>• {t("admin.lookups.valueDisplayRequired")}</li>
        <li>• {t("admin.lookups.existingRecordsUpdated")}</li>
        <li>• {t("admin.lookups.booleanFieldsFormat")}</li>
        <li>• {t("admin.lookups.dateFieldsFormat")}</li>
        <li>• {t("admin.lookups.emailFieldsValid")}</li>
        <li>• {t("admin.lookups.urlFieldsValid")}</li>
      </ul>
    </div>
  );
};

export default ImportModal;
