// src/components/Scripts/ScriptEditor/tabs/HistoryTab.js
import React from "react";
import { useTranslation } from "react-i18next";
import { ClockIcon } from "@heroicons/react/24/outline";

const HistoryTab = () => {
  const { t } = useTranslation();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">
        {t("scripts.executionHistory.title")}
      </h2>
      <div className="text-center py-8 text-gray-500">
        <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          {t("scripts.executionHistory.noExecutionHistory")}
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          {t("scripts.executionHistory.noExecutionHistoryDescription")}
        </p>
      </div>
    </div>
  );
};

export default HistoryTab;
