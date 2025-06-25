import React, { forwardRef } from "react";

const FormTextarea = forwardRef(
  ({ label, required, error, className = "", ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
          error ? "border-red-300" : "border-gray-300"
        } ${className}`}
        {...props}
      />
    );
  }
);

export default FormTextarea;
