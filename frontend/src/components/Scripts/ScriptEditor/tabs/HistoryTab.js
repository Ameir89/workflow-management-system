// src/components/Scripts/ScriptEditor/tabs/HistoryTab.js
import React from "react";
import { ClockIcon } from "@heroicons/react/24/outline";

const HistoryTab = () => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">
        Execution History
      </h2>
      <div className="text-center py-8 text-gray-500">
        <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          No execution history
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Script execution history will appear here
        </p>
      </div>
    </div>
  );
};

export default HistoryTab;
