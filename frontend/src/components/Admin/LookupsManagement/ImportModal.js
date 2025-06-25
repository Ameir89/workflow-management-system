// src/components/Admin/LookupsManagement/ImportModal.js
import React, { useState } from "react";
import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import Modal from "../../Common/Modal";

const ImportModal = ({
  isOpen,
  onClose,
  selectedTable,
  onImport,
  isLoading,
}) => {
  const [csvFile, setCsvFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (file) => {
    if (file && file.type === "text/csv") {
      setCsvFile(file);
    } else {
      alert("Please select a valid CSV file");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleImport = () => {
    if (csvFile && selectedTable?.id) {
      onImport(csvFile);
    }
  };

  const handleClose = () => {
    setCsvFile(null);
    setDragOver(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import CSV Data"
      maxWidth="lg"
    >
      <div className="p-6">
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragOver ? "border-indigo-500 bg-indigo-50" : "border-gray-300"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {csvFile ? (
            <FileSelected file={csvFile} onRemove={() => setCsvFile(null)} />
          ) : (
            <FileDropzone onFileSelect={handleFileSelect} />
          )}
        </div>

        <ImportGuidelines />
      </div>

      <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
        <button
          onClick={handleClose}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          onClick={handleImport}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center"
          disabled={!csvFile || isLoading}
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          ) : null}
          Import Data
        </button>
      </div>
    </Modal>
  );
};

const FileDropzone = ({ onFileSelect }) => {
  return (
    <div>
      <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
      <p className="mt-2 text-sm text-gray-600">
        Drop your CSV file here, or{" "}
        <label className="text-indigo-600 hover:text-indigo-500 cursor-pointer">
          browse
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => onFileSelect(e.target.files[0])}
          />
        </label>
      </p>
      <p className="text-xs text-gray-500 mt-1">CSV files only</p>
    </div>
  );
};

const FileSelected = ({ file, onRemove }) => {
  return (
    <div>
      <div className="inline-flex items-center px-3 py-2 bg-green-100 text-green-800 rounded-lg">
        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
        {file.name}
      </div>
      <p className="text-xs text-gray-500 mt-2">
        {(file.size / 1024).toFixed(2)} KB
      </p>
      <button
        onClick={onRemove}
        className="mt-2 text-sm text-red-600 hover:text-red-800"
      >
        Remove file
      </button>
    </div>
  );
};

const ImportGuidelines = () => {
  return (
    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
      <h4 className="text-sm font-medium text-blue-900">Import Guidelines:</h4>
      <ul className="text-xs text-blue-800 mt-1 space-y-1">
        <li>• First row should contain column headers</li>
        <li>• Column names should match field names in the table</li>
        <li>• Required fields must have values</li>
        <li>• Existing records with matching IDs will be updated</li>
        <li>• Boolean fields accept: true/false, 1/0, yes/no</li>
        <li>• Date fields should be in YYYY-MM-DD format</li>
      </ul>
    </div>
  );
};

export default ImportModal;
