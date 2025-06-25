import React from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

const ErrorDisplay = ({ title, message, onBack }) => {
  return (
    <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-center">
        <ExclamationTriangleIcon className="h-6 w-6 text-red-400 mr-3" />
        <h3 className="text-lg font-medium text-red-800">{title}</h3>
      </div>
      <p className="mt-2 text-red-700">{message}</p>
      {onBack && (
        <button onClick={onBack} className="mt-4 btn btn-outline btn-sm">
          Back
        </button>
      )}
    </div>
  );
};

export default ErrorDisplay;
