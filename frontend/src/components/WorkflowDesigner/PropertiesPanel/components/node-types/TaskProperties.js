// src/components/WorkflowDesigner/PropertiesPanel/components/node-types/TaskProperties.js
import React from "react";
import { useTranslation } from "react-i18next";
import FormField from "../../../../../components/Common/FormField";
import FormSelect from "../../../../../components/Common/FormSelect";
import FormTextarea from "../../../../../components/Common/FormTextarea";
import PropertySection from "../PropertySection";

const TaskProperties = ({ node, forms, onPropertyChange }) => {
  const { t } = useTranslation();
  const properties = node.properties || {};

  const formOptions = [
    { value: "", label: t("designer.selectForm") },
    ...forms.map((form) => ({
      value: form.id,
      label: form.name,
    })),
  ];

  const priorityOptions = [
    { value: "low", label: t("designer.priority.low") },
    { value: "medium", label: t("designer.priority.medium") },
    { value: "high", label: t("designer.priority.high") },
    { value: "urgent", label: t("designer.priority.urgent") },
  ];

  return (
    <PropertySection title={t("designer.taskProperties")}>
      <div className="space-y-4">
        <FormField
          label={t("designer.assignee")}
          help={t("designer.assigneeHelp")}
        >
          <input
            type="email"
            value={properties.assignee || ""}
            onChange={(e) => onPropertyChange("assignee", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="user@example.com"
          />
        </FormField>

        <FormField
          label={t("designer.dueHours")}
          help={t("designer.dueHoursHelp")}
        >
          <input
            type="number"
            value={properties.dueHours || 24}
            onChange={(e) =>
              onPropertyChange("dueHours", parseInt(e.target.value) || 24)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            min="1"
            max="8760" // 1 year
          />
        </FormField>

        <FormSelect
          label={t("designer.priority")}
          value={properties.priority || "medium"}
          onChange={(e) => onPropertyChange("priority", e.target.value)}
          options={priorityOptions}
        />

        <FormField label={t("designer.instructions")}>
          <FormTextarea
            value={properties.instructions || ""}
            onChange={(e) => onPropertyChange("instructions", e.target.value)}
            rows={3}
            placeholder={t("designer.instructionsPlaceholder")}
          />
        </FormField>

        <FormSelect
          label={t("workflow.form")}
          value={properties.formId || ""}
          onChange={(e) => onPropertyChange("formId", e.target.value)}
          options={formOptions}
        />

        {properties.formId && (
          <div className="p-3 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-700">
              {t("designer.formSelectedInfo")}
            </p>
          </div>
        )}
      </div>
    </PropertySection>
  );
};

export default TaskProperties;
