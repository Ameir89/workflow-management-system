// src/components/WorkflowDesigner/PropertiesPanel/components/node-types/notification/TemplateSelector.js
import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { DocumentTextIcon, EyeIcon } from "@heroicons/react/24/outline";
import FormSelect from "../../../../../../Common/FormSelect";
import TemplatePreview from "./TemplatePreview";
import TemplateVariables from "./TemplateVariables";

const TemplateSelector = ({
  templatesData,
  templatesLoading,
  selectedTemplateName,
  selectedTemplateDetails,
  templateVariableValues,
  onPropertyChange,
}) => {
  const { t } = useTranslation();
  const [showTemplatePreview, setShowTemplatePreview] = useState(true);

  // Format template options from notification management service
  const templateOptions = [
    { value: "", label: t("designer.selectTemplate") },
    ...(templatesData?.templates || []).map((template) => ({
      value: template.id,
      label: `${template.name} (${
        (template.channels || []).join(", ") || "Email"
      })`,
      data: template,
    })),
  ];
  console.log("Template selectedTemplateName:", selectedTemplateName);
  // Find selected template - try multiple sources
  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateName) return null;

    // First try from detailed query
    if (selectedTemplateDetails?.template) {
      return selectedTemplateDetails.template;
    }

    // Then try from the list
    if (templatesData?.templates) {
      return templatesData.templates.find(
        (template) => template.name === selectedTemplateName
      );
    }

    return null;
  }, [selectedTemplateName, selectedTemplateDetails, templatesData]);

  const handleTemplateChange = (templateId) => {
    console.log("Template selected:", templateId);

    // onPropertyChange("template", templateId);

    if (templateId && templatesData?.templates) {
      const templateOption = templatesData.templates.find(
        (t) => t.id === templateId
      );

      if (templateOption) {
        console.log("Found template:", templateOption.name);
        onPropertyChange("template", templateOption.name);

        // Set channel from template channels
        const channels = templateOption.channels || [];
        if (channels.length > 0) {
          onPropertyChange("channel", channels[0]);
        }

        // Pre-populate recipients if template has defaults
        if (templateOption.default_recipients) {
          onPropertyChange("recipients", templateOption.default_recipients);
        }
      }
    } else if (!templateId) {
      // Clear template data when no template is selected
      onPropertyChange("selectedTemplateName", "");
    }
  };

  return (
    <div className="space-y-4">
      <FormSelect
        label={t("designer.selectTemplate")}
        value={selectedTemplateName}
        onChange={(e) => handleTemplateChange(e.target.value)}
        options={templateOptions}
        disabled={templatesLoading}
      />

      {templatesLoading && (
        <div className="flex items-center text-sm text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
          Loading templates...
        </div>
      )}

      {/* Debug info - remove in production */}
      {process.env.NODE_ENV === "development" && (
        <div className="p-2 bg-yellow-50 rounded text-xs">
          <div>Selected Template Name: {selectedTemplateName || "None"}</div>
          <div>Templates Count: {templatesData?.templates?.length || 0}</div>
          <div>Selected Template Found: {selectedTemplate ? "Yes" : "No"}</div>
          {selectedTemplate && (
            <div>Template Name: {selectedTemplate.name}</div>
          )}
        </div>
      )}

      {selectedTemplate && (
        <div className="space-y-3">
          {/* Template Info Card */}
          <div className="p-3 bg-blue-50 rounded-md">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-2">
                <DocumentTextIcon className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h5 className="text-sm font-medium text-blue-900">
                    {selectedTemplate.name}
                  </h5>
                  <p className="text-xs text-blue-700 mt-1">
                    {selectedTemplate.description}
                  </p>
                  <div className="flex items-center space-x-4 mt-2 text-xs text-blue-600">
                    <span>
                      Channels:{" "}
                      {(selectedTemplate.channels || []).join(", ") || "Email"}
                    </span>
                    {selectedTemplate.created_by_username && (
                      <span>By: {selectedTemplate.created_by_username}</span>
                    )}
                    {selectedTemplate.usage_count !== undefined && (
                      <span>Used: {selectedTemplate.usage_count} times</span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowTemplatePreview(!showTemplatePreview)}
                className="flex items-center text-xs text-blue-600 hover:text-blue-700"
              >
                <EyeIcon className="h-3 w-3 mr-1" />
                {showTemplatePreview ? "Hide" : "Preview"}
              </button>
            </div>
          </div>

          {/* Template Preview */}
          {showTemplatePreview && (
            <TemplatePreview template={selectedTemplate} />
          )}

          {/* Template Variables */}
          {selectedTemplate.message_template && (
            <TemplateVariables
              template={selectedTemplate}
              templateVariableValues={templateVariableValues}
              onPropertyChange={onPropertyChange}
            />
          )}
        </div>
      )}

      {/* No Templates Available Message */}
      {!templatesLoading &&
        (!templatesData?.templates || templatesData.templates.length === 0) && (
          <div className="p-3 bg-gray-50 rounded-md text-center">
            <p className="text-sm text-gray-600">
              No notification templates available for workflows.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Create notification templates in the Notification Management
              section to use them in workflows.
            </p>
          </div>
        )}
    </div>
  );
};

export default TemplateSelector;
