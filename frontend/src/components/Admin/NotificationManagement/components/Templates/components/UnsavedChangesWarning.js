// src/components/Notifications/Templates/components/UnsavedChangesWarning.js
import React from "react";
import { useTranslation } from "react-i18next";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

const UnsavedChangesWarning = () => {
  const { t } = useTranslation();

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-center">
        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2" />
        <span className="text-yellow-800 text-sm">
          {t("notifications.unsavedChanges")}
        </span>
      </div>
    </div>
  );
};

export default UnsavedChangesWarning;
