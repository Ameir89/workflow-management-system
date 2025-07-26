// src/components/WorkflowDesigner/PropertiesPanel/components/node-types/notification/TemplatePreview.js
import React from "react";

const TemplatePreview = ({ template }) => {
  const generatePreviewContent = (template, variables = {}) => {
    let content = template.message_template || template.content || "";

    // Replace common variables with example values
    const exampleVariables = {
      workflow_name: "Sample Workflow",
      task_name: "Sample Task",
      assignee: "John Doe",
      due_date: "2024-07-15",
      requester: "Jane Smith",
      status: "Pending",
      user_name: "John Doe",
      workflow_title: "Sample Workflow",
      timestamp: new Date().toLocaleString(),
      ...variables,
    };

    Object.entries(exampleVariables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
      content = content.replace(regex, value);
    });

    return content;
  };

  return (
    <div className="p-3 bg-gray-50 rounded-md">
      <h6 className="text-xs font-medium text-gray-900 mb-2">
        Template Preview:
      </h6>

      {template.title_template && (
        <div className="mb-2">
          <div className="text-xs text-gray-600">Subject:</div>
          <div className="text-sm bg-white p-2 rounded border">
            {generatePreviewContent({
              message_template: template.title_template,
            })}
          </div>
        </div>
      )}

      <div className="text-xs text-gray-600 mb-1">Content:</div>
      <div className="text-sm bg-white p-2 rounded border max-h-32 overflow-y-auto">
        <div className="whitespace-pre-wrap">
          {generatePreviewContent(template)}
        </div>
      </div>

      {/* Show available variables from template content */}
      <div className="mt-2">
        <div className="text-xs text-gray-600 mb-1">
          Variables found in template:
        </div>
        <div className="flex flex-wrap gap-1">
          {(() => {
            const content = template.message_template || "";
            const variables = content.match(/\{\{([^}]+)\}\}/g) || [];
            const uniqueVars = [...new Set(variables)];
            return uniqueVars.map((variable, index) => (
              <code
                key={index}
                className="text-xs bg-blue-100 px-1 py-0.5 rounded"
              >
                {variable}
              </code>
            ));
          })()}
        </div>
      </div>
    </div>
  );
};

export default TemplatePreview;
