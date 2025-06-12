import React from "react";
import {
  CheckCircleIcon,
  ClockIcon,
  BellIcon,
  QuestionMarkCircleIcon,
  CogIcon,
} from "@heroicons/react/24/outline";

const WorkflowNode = ({
  step,
  selected,
  connectionMode,
  connectionStart,
  onSelect,
  onUpdate,
  onDelete,
  onStartConnection,
  onEndConnection,
  zoom,
}) => {
  const getNodeIcon = (type) => {
    switch (type) {
      case "task":
        return <CheckCircleIcon className="h-5 w-5" />;
      case "approval":
        return <ClockIcon className="h-5 w-5" />;
      case "notification":
        return <BellIcon className="h-5 w-5" />;
      case "condition":
        return <QuestionMarkCircleIcon className="h-5 w-5" />;
      case "automation":
        return <CogIcon className="h-5 w-5" />;
      default:
        return <CheckCircleIcon className="h-5 w-5" />;
    }
  };

  const getNodeColor = (type) => {
    switch (type) {
      case "task":
        return "border-blue-500 bg-blue-50 text-blue-600";
      case "approval":
        return "border-green-500 bg-green-50 text-green-600";
      case "notification":
        return "border-yellow-500 bg-yellow-50 text-yellow-600";
      case "condition":
        return "border-purple-500 bg-purple-50 text-purple-600";
      case "automation":
        return "border-gray-500 bg-gray-50 text-gray-600";
      default:
        return "border-gray-500 bg-gray-50 text-gray-600";
    }
  };

  const handleClick = () => {
    if (connectionMode) {
      if (connectionStart === step.id) {
        // Cancel connection
        return;
      }
      onEndConnection(step.id);
    } else {
      onSelect();
    }
  };

  const handleConnectionStart = (e) => {
    e.stopPropagation();
    onStartConnection(step.id);
  };

  return (
    <div
      className={`absolute cursor-pointer transform transition-transform hover:scale-105 ${
        selected ? "ring-2 ring-indigo-500" : ""
      }`}
      style={{
        left: step.position.x,
        top: step.position.y,
        transform: `scale(${Math.max(0.5, zoom)})`,
      }}
      onClick={handleClick}
    >
      <div
        className={`
          relative bg-white border-2 rounded-lg p-3 shadow-sm min-w-32
          ${getNodeColor(step.type)}
          ${selected ? "ring-2 ring-indigo-500" : ""}
          ${
            connectionMode && connectionStart !== step.id
              ? "ring-2 ring-green-400"
              : ""
          }
        `}
      >
        {/* Start indicator */}
        {step.isStart && (
          <div className="absolute -top-2 -left-2 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
        )}

        {/* Node content */}
        <div className="flex items-center space-x-2">
          {getNodeIcon(step.type)}
          <div>
            <div className="text-sm font-medium">{step.name}</div>
            <div className="text-xs opacity-75">{step.type}</div>
          </div>
        </div>

        {/* Connection point */}
        <button
          className="absolute -right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-white border-2 border-gray-300 rounded-full hover:border-indigo-500"
          onClick={handleConnectionStart}
          title="Connect to another node"
        ></button>

        {/* Delete button */}
        {selected && (
          <button
            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Delete node"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

export default WorkflowNode;
