// src/components/Common/ConfirmDialog.js
import React from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import Modal from "./Modal";

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger", // danger, warning, info
  isLoading = false,
}) => {
  const variants = {
    danger: {
      icon: "text-red-600",
      button: "bg-red-600 hover:bg-red-700",
    },
    warning: {
      icon: "text-yellow-600",
      button: "bg-yellow-600 hover:bg-yellow-700",
    },
    info: {
      icon: "text-blue-600",
      button: "bg-blue-600 hover:bg-blue-700",
    },
  };

  const currentVariant = variants[variant] || variants.danger;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="md">
      <div className="p-6">
        <div className="flex items-center space-x-4">
          <div className={`flex-shrink-0 ${currentVariant.icon}`}>
            <ExclamationTriangleIcon className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
            <p className="text-sm text-gray-600">{message}</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          disabled={isLoading}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center ${currentVariant.button}`}
          disabled={isLoading}
        >
          {isLoading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
          )}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
