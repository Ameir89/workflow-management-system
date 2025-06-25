// Enhanced PropertiesPanel.js with transition condition support
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import { formsService } from "../../../services/formsService";
import {
  Cog6ToothIcon,
  ArrowRightIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

// Component imports
import PanelHeader from "./components/PanelHeader";
import PanelTabs from "./components/PanelTabs";
import WorkflowProperties from "./components/WorkflowProperties";
import NodeProperties from "./components/NodeProperties";
import TransitionProperties from "./components/TransitionProperties";

// Hooks
import { usePropertyHandlers } from "./hooks/usePropertyHandlers";

const PropertiesPanel = ({
  workflow,
  selectedNode,
  selectedTransition,
  onUpdateWorkflow,
  onUpdateNode,
  onUpdateTransition,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("properties");
  // Fetch forms data for dropdowns
  const { data: formsData, isLoading: formsLoading } = useQuery(
    ["forms"],
    () => formsService.getForms(),
    { keepPreviousData: true }
  );

  // Custom hook for property change handlers
  const {
    handleWorkflowChange,
    handleNodeChange,
    handleNodePropertyChange,
    handleTransitionChange,
  } = usePropertyHandlers({
    selectedNode,
    selectedTransition,
    onUpdateWorkflow,
    onUpdateNode,
    onUpdateTransition,
  });

  const tabs = [
    {
      id: "properties",
      name: t("designer.properties"),
      icon: Cog6ToothIcon,
    },
    {
      id: "transition",
      name: t("designer.transition"),
      icon: ArrowRightIcon,
    },
  ];

  useEffect(() => {
    // // Reset active tab when selection changes
    if (selectedTransition) {
      setActiveTab("transition");
    } else if (selectedNode) {
      setActiveTab("properties");
    } else {
      setActiveTab("properties");
    }
  }, [selectedTransition, selectedNode]);

  const renderContent = () => {
    if (activeTab === "transition" && selectedTransition) {
      return (
        <TransitionProperties
          transition={selectedTransition}
          workflow={workflow}
          onTransitionChange={handleTransitionChange}
        />
      );
    }

    if (activeTab !== "properties") return null;

    if (selectedNode) {
      return (
        <NodeProperties
          node={selectedNode}
          forms={formsData?.forms || []}
          formsLoading={formsLoading}
          onNodeChange={handleNodeChange}
          onPropertyChange={handleNodePropertyChange}
        />
      );
    }

    return (
      <WorkflowProperties
        workflow={workflow}
        onWorkflowChange={handleWorkflowChange}
      />
    );
  };

  const getHeaderTitle = () => {
    if (selectedTransition) {
      const fromStep = workflow.definition.steps.find(
        (s) => s.id === selectedTransition.from
      );
      const toStep = workflow.definition.steps.find(
        (s) => s.id === selectedTransition.to
      );
      return `${fromStep?.name || "Unknown"} → ${toStep?.name || "Unknown"}`;
    }
    if (selectedNode) {
      return selectedNode.name;
    }
    return t("designer.workflowProperties");
  };

  const getHeaderSubtitle = () => {
    if (selectedTransition) {
      return t("designer.transition");
    }
    if (selectedNode) {
      return t(`designer.nodeTypes.${selectedNode.type}`);
    }
    return null;
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          {getHeaderTitle()}
        </h3>
        {getHeaderSubtitle() && (
          <p className="text-sm text-gray-500 capitalize">
            {getHeaderSubtitle()}
          </p>
        )}
      </div>

      <PanelTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 overflow-y-auto p-4">{renderContent()}</div>
    </div>
  );
};

// TransitionProperties Component

export default PropertiesPanel;
