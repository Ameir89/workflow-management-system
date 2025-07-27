// src/components/Scripts/ScriptEditor/UnsavedChangesModal.js
import React from "react";
import { useTranslation } from "react-i18next";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

const UnsavedChangesModal = ({ isOpen, onClose, onSave, onLeave }) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div className="flex items-center mb-4">
          <ExclamationTriangleIcon className="h-6 w-6 text-amber-500 mr-3" />
          <h3 className="text-lg font-medium text-gray-900">
            {t("scripts.unsavedChanges.unsavedChanges")}
          </h3>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          {t("scripts.unsavedChanges.unsavedChangesMessage")}
        </p>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            {t("scripts.unsavedChanges.cancel")}
          </button>
          <button
            onClick={onLeave}
            className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
          >
            {t("scripts.unsavedChanges.leaveWithoutSaving")}
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
          >
            {t("scripts.unsavedChanges.saveAndLeave")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnsavedChangesModal;
