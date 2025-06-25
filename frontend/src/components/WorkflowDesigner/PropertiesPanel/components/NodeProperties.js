// src/components/WorkflowDesigner/PropertiesPanel/components/NodeProperties.js
import React from "react";
import { useTranslation } from "react-i18next";
import FormField from "../../../Common/FormField";
import FormTextarea from "../../../Common/FormTextarea";
import FormCheckbox from "../../../Common/FormCheckbox";
import LoadingSpinner from "../../../Common/LoadingSpinner";

// Type-specific property components
import TaskProperties from "./node-types/TaskProperties";
import ApprovalProperties from "./node-types/ApprovalProperties";
import NotificationProperties from "./node-types/NotificationProperties";
import ConditionProperties from "./node-types/ConditionProperties";
import AutomationProperties from "./node-types/AutomationProperties";

const NodeProperties = ({
  node,
  forms,
  formsLoading,
  onNodeChange,
  onPropertyChange,
}) => {
  const { t } = useTranslation();

  const renderTypeSpecificProperties = () => {
    if (formsLoading) {
      return <LoadingSpinner size="sm" text={t("common.loadingForms")} />;
    }

    const commonProps = {
      node,
      forms,
      onPropertyChange,
    };

    switch (node.type) {
      case "task":
        return <TaskProperties {...commonProps} />;
      case "approval":
        return <ApprovalProperties {...commonProps} />;
      case "notification":
        return <NotificationProperties {...commonProps} />;
      case "condition":
        return <ConditionProperties {...commonProps} />;
      case "automation":
        return <AutomationProperties {...commonProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic Node Properties */}
      <div className="space-y-4">
        <FormField label={t("designer.nodeName")} required>
          <input
            type="text"
            value={node.name || ""}
            onChange={(e) => onNodeChange("name", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder={t("designer.enterNodeName")}
          />
        </FormField>

        <FormField label={t("designer.nodeDescription")}>
          <FormTextarea
            value={node.description || ""}
            onChange={(e) => onNodeChange("description", e.target.value)}
            rows={2}
            placeholder={t("designer.enterNodeDescription")}
          />
        </FormField>

        <FormCheckbox
          label={t("designer.startNode")}
          checked={node.isStart || false}
          onChange={(e) => onNodeChange("isStart", e.target.checked)}
        />
      </div>

      {/* Type-specific Properties */}
      {renderTypeSpecificProperties()}
    </div>
  );
};

export default NodeProperties;
