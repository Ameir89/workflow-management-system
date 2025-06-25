// src/components/WorkflowDesigner/PropertiesPanel/components/PropertySection.js
import React from "react";

const PropertySection = ({ title, children, className = "" }) => {
  return (
    <div className={`border-t pt-4 first:border-t-0 first:pt-0 ${className}`}>
      {title && (
        <h4 className="text-sm font-medium text-gray-900 mb-4">{title}</h4>
      )}
      {children}
    </div>
  );
};

export default PropertySection;
