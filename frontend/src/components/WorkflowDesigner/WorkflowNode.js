import React, { useRef, useEffect } from "react";
import {
  CheckCircleIcon,
  ClockIcon,
  BellIcon,
  QuestionMarkCircleIcon,
  CogIcon,
  PlayIcon,
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
  const nodeRef = useRef(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState(null);

  // Simple drag and drop implementation without React DnD for the node content
  const handleMouseDown = (e) => {
    if (
      e.target.closest(".connection-point") ||
      e.target.closest(".action-button")
    ) {
      return; // Don't start dragging on connection points or action buttons
    }

    setIsDragging(true);
    setDragStart({
      x: e.clientX - step.position.x,
      y: e.clientY - step.position.y,
    });
    e.preventDefault();
  };

  const handleMouseMove = React.useCallback(
    (e) => {
      if (isDragging && dragStart) {
        const newPosition = {
          x: Math.round((e.clientX - dragStart.x) / 20) * 20, // Snap to grid
          y: Math.round((e.clientY - dragStart.y) / 20) * 20,
        };

        onUpdate(step.id, { position: newPosition });
      }
    },
    [isDragging, dragStart, onUpdate]
  );

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
  }, []);

  // Add global mouse listeners when dragging
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

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

  const getNodeStyles = (type) => {
    const baseStyles =
      "relative bg-white border-2 rounded-lg p-4 shadow-md min-w-[160px] transition-all duration-200 select-none";

    const typeStyles = {
      task: "border-blue-500 hover:border-blue-600 hover:shadow-lg",
      approval: "border-green-500 hover:border-green-600 hover:shadow-lg",
      notification: "border-yellow-500 hover:border-yellow-600 hover:shadow-lg",
      condition: "border-purple-500 hover:border-purple-600 hover:shadow-lg",
      automation: "border-gray-500 hover:border-gray-600 hover:shadow-lg",
    };

    return `${baseStyles} ${typeStyles[type] || typeStyles.task}`;
  };

  const getNodeBackgroundColor = (type) => {
    const backgroundColors = {
      task: "bg-blue-50",
      approval: "bg-green-50",
      notification: "bg-yellow-50",
      condition: "bg-purple-50",
      automation: "bg-gray-50",
    };
    return backgroundColors[type] || backgroundColors.task;
  };

  const getNodeTextColor = (type) => {
    const textColors = {
      task: "text-blue-700",
      approval: "text-green-700",
      notification: "text-yellow-700",
      condition: "text-purple-700",
      automation: "text-gray-700",
    };
    return textColors[type] || textColors.task;
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (connectionMode) {
      if (connectionStart === step.id) {
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

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this node?")) {
      onDelete();
    }
  };

  return (
    <div
      ref={nodeRef}
      className={`absolute transform transition-all duration-200 ${
        isDragging ? "opacity-80 scale-95 z-50" : selected ? "z-20" : "z-10"
      }`}
      style={{
        left: step.position.x,
        top: step.position.y,
        transform: `scale(${Math.max(0.7, zoom)})`,
        transformOrigin: "top left",
        cursor: isDragging ? "grabbing" : "grab",
      }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
    >
      <div
        className={`
          ${getNodeStyles(step.type)}
          ${getNodeBackgroundColor(step.type)}
          ${selected ? "ring-2 ring-indigo-500 ring-offset-2 shadow-xl" : ""}
          ${
            connectionMode && connectionStart !== step.id
              ? "ring-2 ring-green-400 ring-offset-1"
              : ""
          }
          ${isDragging ? "cursor-grabbing" : "cursor-grab"}
        `}
      >
        {/* Start indicator */}
        {step.isStart && (
          <div className="absolute -top-3 -left-3 w-6 h-6 bg-green-500 rounded-full border-2 border-white shadow-md flex items-center justify-center">
            <PlayIcon className="h-3 w-3 text-white" />
          </div>
        )}

        {/* Main node content */}
        <div className="flex items-start space-x-3">
          <div
            className={`p-2 rounded-lg ${getNodeBackgroundColor(
              step.type
            )} border`}
          >
            <div className={getNodeTextColor(step.type)}>
              {getNodeIcon(step.type)}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div
              className={`text-sm font-semibold ${getNodeTextColor(
                step.type
              )} truncate`}
            >
              {step.name}
            </div>
            <div className="text-xs text-gray-500 capitalize mt-1">
              {step.type}
            </div>
            {step.description && (
              <div className="text-xs text-gray-400 mt-1 line-clamp-2">
                {step.description}
              </div>
            )}
          </div>
        </div>

        {/* Properties preview */}
        {step.properties && (
          <div className="mt-3 pt-2 border-t border-gray-200">
            <div className="flex flex-wrap gap-1">
              {step.properties.assignee && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  {step.properties.assignee}
                </span>
              )}
              {step.properties.dueHours && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  {step.properties.dueHours}h
                </span>
              )}
            </div>
          </div>
        )}

        {/* Connection points */}
        <div className="absolute -right-2 top-1/2 transform -translate-y-1/2">
          <button
            className="connection-point w-4 h-4 bg-white border-2 border-gray-400 rounded-full hover:border-indigo-500 hover:bg-indigo-50 transition-colors duration-200 shadow-sm"
            onClick={handleConnectionStart}
            title="Connect to another node"
          >
            <div className="w-full h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 opacity-60"></div>
          </button>
        </div>

        {/* Input connection point */}
        <div className="absolute -left-2 top-1/2 transform -translate-y-1/2">
          <div className="w-3 h-3 bg-white border-2 border-gray-300 rounded-full shadow-sm"></div>
        </div>

        {/* Action buttons (only show when selected) */}
        {selected && (
          <div className="absolute -top-2 -right-2 flex space-x-1">
            <button
              className="action-button w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-colors duration-200 flex items-center justify-center shadow-md"
              onClick={handleDelete}
              title="Delete node"
            >
              ×
            </button>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white to-transparent opacity-0 hover:opacity-10 transition-opacity duration-200 pointer-events-none"></div>
      </div>
    </div>
  );
};

export default WorkflowNode;
