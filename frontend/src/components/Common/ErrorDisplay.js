import React from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";

const ErrorDisplay = ({ title, message, onBack }) => {
  const { t } = useTranslation();
  return (
    <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-center">
        <ExclamationTriangleIcon className="h-6 w-6 text-red-400 mr-3" />
        <h3 className="text-lg font-medium text-red-800">{title}</h3>
      </div>
      <p className="mt-2 text-red-700">{message}</p>
      {onBack && (
        <button onClick={onBack} className="mt-4 btn btn-outline btn-sm">
          {t("common.back")}
        </button>
      )}
    </div>
  );
};

export default ErrorDisplay;
