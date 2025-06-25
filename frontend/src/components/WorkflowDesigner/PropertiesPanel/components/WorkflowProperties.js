// src/components/WorkflowDesigner/PropertiesPanel/components/WorkflowProperties.js
import React from "react";
import { useTranslation } from "react-i18next";
import FormField from "../../../Common/FormField";
import FormSelect from "../../../Common/FormSelect";
import FormTextarea from "../../../Common/FormTextarea";
import FormCheckbox from "../../../Common/FormCheckbox";

const WorkflowProperties = ({ workflow, onWorkflowChange }) => {
  const { t } = useTranslation();

  const categoryOptions = [
    { value: "", label: t("workflow.selectCategory") },
    { value: "approval", label: t("workflow.categories.approval") },
    { value: "automation", label: t("workflow.categories.automation") },
    { value: "notification", label: t("workflow.categories.notification") },
    { value: "integration", label: t("workflow.categories.integration") },
  ];

  return (
    <div className="space-y-6">
      <FormField label={t("workflow.name")} required>
        <input
          type="text"
          value={workflow.name || ""}
          onChange={(e) => onWorkflowChange("name", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder={t("workflow.enterName")}
        />
      </FormField>

      <FormField label={t("workflow.description")}>
        <FormTextarea
          value={workflow.description || ""}
          onChange={(e) => onWorkflowChange("description", e.target.value)}
          rows={3}
          placeholder={t("workflow.enterDescription")}
        />
      </FormField>

      <FormSelect
        label={t("workflow.category")}
        value={workflow.category || ""}
        onChange={(e) => onWorkflowChange("category", e.target.value)}
        options={categoryOptions}
      />

      <FormCheckbox
        label={t("workflow.active")}
        checked={workflow.is_active !== false}
        onChange={(e) => onWorkflowChange("is_active", e.target.checked)}
      />
    </div>
  );
};

export default WorkflowProperties;
