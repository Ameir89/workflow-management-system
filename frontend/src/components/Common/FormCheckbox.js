import React, { forwardRef } from "react";

const FormCheckbox = forwardRef(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="flex items-center">
        <input
          ref={ref}
          type="checkbox"
          className={`h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded ${className}`}
          {...props}
        />
        {label && (
          <label className="ml-2 block text-sm text-gray-900">{label}</label>
        )}
        {error && <p className="ml-2 text-sm text-red-600">{error.message}</p>}
      </div>
    );
  }
);

export default FormCheckbox;
