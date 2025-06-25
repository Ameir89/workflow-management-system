// src/components/WorkflowDesigner/PropertiesPanel/components/PanelHeader.js
import React from "react";
import { useTranslation } from "react-i18next";

const PanelHeader = ({ selectedNode }) => {
  const { t } = useTranslation();

  const getNodeTypeLabel = (type) => {
    const typeLabels = {
      task: t("designer.nodeTypes.task"),
      approval: t("designer.nodeTypes.approval"),
      notification: t("designer.nodeTypes.notification"),
      condition: t("designer.nodeTypes.condition"),
      automation: t("designer.nodeTypes.automation"),
    };
    return typeLabels[type] || type;
  };

  return (
    <div className="px-4 py-3 border-b border-gray-200">
      <h3 className="text-lg font-medium text-gray-900">
        {selectedNode ? selectedNode.name : t("designer.workflowProperties")}
      </h3>
      {selectedNode && (
        <p className="text-sm text-gray-500 capitalize">
          {getNodeTypeLabel(selectedNode.type)}
        </p>
      )}
    </div>
  );
};

export default PanelHeader;
