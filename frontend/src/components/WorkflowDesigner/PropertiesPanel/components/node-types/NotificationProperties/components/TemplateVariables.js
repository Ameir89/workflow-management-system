// src/components/WorkflowDesigner/PropertiesPanel/components/node-types/notification/TemplateVariables.js
import React from "react";
import FormField from "../../../../../../Common/FormField";

const TemplateVariables = ({
  template,
  templateVariableValues,
  onPropertyChange,
}) => {
  // Extract variables from template and create input fields
  const extractVariables = () => {
    const content = template.message_template || "";
    const variables = content.match(/\{\{([^}]+)\}\}/g) || [];
    return [...new Set(variables.map((v) => v.replace(/[{}]/g, "").trim()))];
  };

  const variables = extractVariables();

  if (variables.length === 0) {
    return null;
  }

  const handleVariableChange = (variableKey, value) => {
    const currentValues = templateVariableValues || {};
    onPropertyChange("templateVariableValues", {
      ...currentValues,
      [variableKey]: value,
    });
  };

  return (
    <div className="space-y-3">
      <h6 className="text-sm font-medium text-gray-900">Variable Values:</h6>
      <div className="text-xs text-gray-600 mb-2">
        Override default variable values for this workflow step:
      </div>

      {variables.map((variableKey, index) => (
        <FormField
          key={index}
          label={variableKey}
          help={`Set value for ${variableKey}`}
        >
          <input
            type="text"
            value={templateVariableValues?.[variableKey] || ""}
            onChange={(e) => handleVariableChange(variableKey, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder={`Enter ${variableKey}`}
          />
        </FormField>
      ))}
    </div>
  );
};

export default TemplateVariables;
