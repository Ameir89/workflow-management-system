import React from "react";
import { useDrag } from "react-dnd";
import { useTranslation } from "react-i18next";
import "./NodePalette.css";

const DraggableNode = ({ nodeType, icon, label, description }) => {
  const [{ isDragging }, drag] = useDrag({
    type: "workflow-node",
    item: { nodeType },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag}
      className={`palette-node ${isDragging ? "dragging" : ""}`}
      title={description}
    >
      <div className="node-icon">{icon}</div>
      <div className="node-label">{label}</div>
    </div>
  );
};

const NodePalette = ({ onAddNode }) => {
  const { t } = useTranslation();

  const nodeTypes = [
    {
      type: "task",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      ),
      label: t("workflow.nodes.task"),
      description: t("workflow.nodes.taskDescription"),
    },
    {
      type: "approval",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      label: t("workflow.nodes.approval"),
      description: t("workflow.nodes.approvalDescription"),
    },
    {
      type: "notification",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-5 5-5-5h5V12h10v5z"
          />
        </svg>
      ),
      label: t("workflow.nodes.notification"),
      description: t("workflow.nodes.notificationDescription"),
    },
    {
      type: "condition",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      label: t("workflow.nodes.condition"),
      description: t("workflow.nodes.conditionDescription"),
    },
    {
      type: "automation",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
      label: t("workflow.nodes.automation"),
      description: t("workflow.nodes.automationDescription"),
    },
  ];

  return (
    <div className="node-palette">
      <div className="palette-header">
        <h3>{t("designer.nodePalette")}</h3>
        <p className="text-sm text-gray-600">
          {t("designer.dragNodesInstructions")}
        </p>
      </div>

      <div className="palette-nodes">
        {nodeTypes.map((nodeType) => (
          <DraggableNode
            key={nodeType.type}
            nodeType={nodeType.type}
            icon={nodeType.icon}
            label={nodeType.label}
            description={nodeType.description}
          />
        ))}
      </div>

      <div className="palette-footer">
        <div className="text-xs text-gray-500">
          <p>{t("designer.tips.title")}</p>
          <ul className="mt-2 space-y-1">
            <li>• {t("designer.tips.dragDrop")}</li>
            <li>• {t("designer.tips.selectEdit")}</li>
            <li>• {t("designer.tips.deleteKey")}</li>
            <li>• {t("designer.tips.escape")}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NodePalette;
