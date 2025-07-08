// src/components/Common/EmptyState.js
import React from "react";

const EmptyState = ({ title, description, icon: Icon, action }) => {
  return (
    <div className="text-center py-12">
      {Icon && (
        <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Icon className="h-12 w-12 text-gray-400" />
        </div>
      )}

      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>

      {description && (
        <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
          {description}
        </p>
      )}

      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
        >
          {action.icon && <action.icon className="h-4 w-4 mr-2" />}
          {action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
