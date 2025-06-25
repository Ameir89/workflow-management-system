// Fixed ConnectionLine.js with proper click handling
import React, { useState } from "react";
import {
  InformationCircleIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

const ConnectionLine = ({
  id,
  transition = {},
  from,
  to,
  selected,
  onDelete,
  onSelect,
  zoom,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Ensure transition has default values
  const safeTransition = {
    id: id,
    name: "",
    description: "",
    condition: null,
    priority: "normal",
    isDefault: false,
    delay: 0,
    ...transition,
  };

  // Calculate start and end points with better positioning
  const startX = from.x + 160; // Adjust based on node width
  const startY = from.y + 40; // Adjust based on node height center
  const endX = to.x;
  const endY = to.y + 40;

  // Calculate control points for smooth bezier curve
  const distance = Math.abs(endX - startX);
  const controlOffset = Math.min(distance * 0.5, 150);

  const controlX1 = startX + controlOffset;
  const controlY1 = startY;
  const controlX2 = endX - controlOffset;
  const controlY2 = endY;

  // Create the path
  const path = `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`;

  // Calculate midpoint for condition label
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;

  // Format condition display
  const formatConditionDisplay = (condition) => {
    if (
      !condition ||
      !condition.rules ||
      !Array.isArray(condition.rules) ||
      condition.rules.length === 0
    ) {
      return null;
    }

    if (condition.rules.length === 1) {
      const rule = condition.rules[0];
      if (!rule || !rule.field || !rule.operator) {
        return null;
      }
      return `${rule.field} ${rule.operator} ${rule.value || ""}`;
    }

    return `${condition.rules.length} conditions (${(
      condition.operator || "AND"
    ).toUpperCase()})`;
  };

  const conditionDisplay = formatConditionDisplay(safeTransition.condition);
  const hasConditions = !!(
    safeTransition.condition &&
    safeTransition.condition.rules &&
    Array.isArray(safeTransition.condition.rules) &&
    safeTransition.condition.rules.length > 0
  );
  const isDefaultTransition = safeTransition.isDefault;

  // Determine line style based on properties
  const getLineStyle = () => {
    if (isDefaultTransition) {
      return {
        stroke: selected ? "#10B981" : isHovered ? "#059669" : "#6B7280",
        strokeWidth: selected || isHovered ? "3" : "2",
        strokeDasharray: "5,5", // Dashed for default transitions
      };
    }

    if (hasConditions) {
      return {
        stroke: selected ? "#3B82F6" : isHovered ? "#2563EB" : "#6366F1",
        strokeWidth: selected || isHovered ? "3" : "2",
        strokeDasharray: "none",
      };
    }

    return {
      stroke: selected ? "#374151" : isHovered ? "#4B5563" : "#6B7280",
      strokeWidth: selected || isHovered ? "3" : "2",
      strokeDasharray: "none",
    };
  };

  const lineStyle = getLineStyle();

  const handleClick = (e) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(safeTransition);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete();
    }
  };

  return (
    <g
      className="connection-line-group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ pointerEvents: "all" }} // Enable pointer events for the entire group
    >
      {/* Invisible wider path for easier clicking - THIS IS THE KEY FIX */}
      <path
        d={path}
        stroke="transparent"
        strokeWidth="20"
        fill="none"
        onClick={handleClick}
        style={{
          pointerEvents: "stroke",
          cursor: "pointer",
        }}
      />

      {/* Main connection line */}
      <path
        d={path}
        stroke={lineStyle.stroke}
        strokeWidth={lineStyle.strokeWidth}
        strokeDasharray={lineStyle.strokeDasharray}
        fill="none"
        className="connection-line"
        markerEnd={`url(#${
          selected || isHovered ? "arrowhead-selected" : "arrowhead"
        })`}
        onClick={handleClick}
        style={{
          transition: "all 0.2s ease",
          filter: isHovered
            ? "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))"
            : "none",
          pointerEvents: "stroke",
          cursor: "pointer",
        }}
      />

      {/* Connection line glow effect when selected */}
      {(selected || isHovered) && (
        <path
          d={path}
          stroke={lineStyle.stroke}
          strokeWidth="6"
          fill="none"
          opacity="0.3"
          className="connection-line-glow"
          style={{
            filter: "blur(2px)",
            pointerEvents: "none", // Glow shouldn't interfere with clicks
          }}
        />
      )}

      {/* Transition Name Label */}
      {(safeTransition.name || conditionDisplay || isDefaultTransition) && (
        <g
          transform={`translate(${midX}, ${midY - 15})`}
          onClick={handleClick}
          style={{ cursor: "pointer" }}
        >
          {/* Label background */}
          <rect
            x="-60"
            y="-12"
            width="120"
            height="24"
            rx="12"
            fill="white"
            stroke={selected ? lineStyle.stroke : "#E5E7EB"}
            strokeWidth={selected ? "2" : "1"}
            className="transition-label-bg"
            style={{
              filter: "drop-shadow(0 1px 3px rgba(0, 0, 0, 0.1))",
              transition: "all 0.2s ease",
              cursor: "pointer",
            }}
          />

          {/* Transition name or type indicator */}
          <text
            textAnchor="middle"
            dy="4"
            className="transition-label-text"
            style={{
              fontSize: "10px",
              fontWeight: "500",
              fill: selected ? lineStyle.stroke : "#374151",
              fontFamily: "Inter, sans-serif",
              cursor: "pointer",
              pointerEvents: "none", // Let clicks pass through to the rect
            }}
          >
            {safeTransition.name ||
              (isDefaultTransition
                ? "Default"
                : hasConditions
                ? "Conditional"
                : "")}
          </text>
        </g>
      )}

      {/* Condition Details Label */}
      {conditionDisplay && (
        <g
          transform={`translate(${midX}, ${midY + 15})`}
          onClick={handleClick}
          style={{ cursor: "pointer" }}
        >
          {/* Condition background */}
          <rect
            x="-70"
            y="-10"
            width="140"
            height="20"
            rx="10"
            fill={hasConditions ? "#EEF2FF" : "#F3F4F6"}
            stroke={hasConditions ? "#C7D2FE" : "#E5E7EB"}
            strokeWidth="1"
            className="condition-label-bg"
            style={{
              filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.05))",
              cursor: "pointer",
            }}
          />

          {/* Condition icon */}
          <g transform="translate(-65, -6)" style={{ pointerEvents: "none" }}>
            <InformationCircleIcon
              width="12"
              height="12"
              style={{
                fill: hasConditions ? "#6366F1" : "#9CA3AF",
                stroke: "none",
              }}
            />
          </g>

          {/* Condition text */}
          <text
            textAnchor="middle"
            dy="3"
            className="condition-details-text"
            style={{
              fontSize: "9px",
              fill: hasConditions ? "#4338CA" : "#6B7280",
              fontFamily: "Inter, sans-serif",
              fontWeight: "400",
              pointerEvents: "none", // Let clicks pass through
            }}
          >
            {conditionDisplay}
          </text>
        </g>
      )}

      {/* Priority indicator */}
      {safeTransition.priority && safeTransition.priority !== "normal" && (
        <g transform={`translate(${startX + 20}, ${startY - 10})`}>
          <circle
            cx="0"
            cy="0"
            r="6"
            fill={safeTransition.priority === "high" ? "#EF4444" : "#F59E0B"}
            stroke="white"
            strokeWidth="1"
            style={{ pointerEvents: "none" }}
          />
          <text
            textAnchor="middle"
            dy="2"
            style={{
              fontSize: "8px",
              fontWeight: "bold",
              fill: "white",
              pointerEvents: "none",
            }}
          >
            {safeTransition.priority === "high" ? "H" : "L"}
          </text>
        </g>
      )}

      {/* Hover controls */}
      {isHovered && (
        <>
          {/* Start point indicator */}
          <circle
            cx={startX}
            cy={startY}
            r="4"
            fill={lineStyle.stroke}
            stroke="white"
            strokeWidth="2"
            className="connection-indicator"
            style={{
              filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))",
              pointerEvents: "none",
            }}
          />

          {/* End point indicator */}
          <circle
            cx={endX}
            cy={endY}
            r="4"
            fill={lineStyle.stroke}
            stroke="white"
            strokeWidth="2"
            className="connection-indicator"
            style={{
              filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))",
              pointerEvents: "none",
            }}
          />

          {/* Action buttons */}
          <g transform={`translate(${midX + 30}, ${midY - 30})`}>
            {/* Edit button */}
            <g transform="translate(-15, 0)">
              <circle
                cx="0"
                cy="0"
                r="12"
                fill="#3B82F6"
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer"
                onClick={handleClick}
                style={{
                  filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))",
                }}
              />
              <g
                transform="translate(-4, -4)"
                style={{ pointerEvents: "none" }}
              >
                <PencilIcon
                  width="8"
                  height="8"
                  style={{
                    stroke: "white",
                    strokeWidth: "1.5",
                    fill: "none",
                  }}
                />
              </g>
            </g>

            {/* Delete button */}
            <g transform="translate(15, 0)">
              <circle
                cx="0"
                cy="0"
                r="12"
                fill="#EF4444"
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer"
                onClick={handleDelete}
                style={{
                  filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))",
                }}
              />
              <g
                transform="translate(-4, -4)"
                style={{ pointerEvents: "none" }}
              >
                <TrashIcon
                  width="8"
                  height="8"
                  style={{
                    stroke: "white",
                    strokeWidth: "1.5",
                    fill: "none",
                  }}
                />
              </g>
            </g>
          </g>
        </>
      )}

      {/* Flow direction indicator */}
      {(selected || isHovered) && (
        <g style={{ pointerEvents: "none" }}>
          {/* Animated flow dots */}
          <circle r="2" fill={lineStyle.stroke} opacity="0.8">
            <animateMotion dur="2s" repeatCount="indefinite" path={path} />
          </circle>
          <circle r="2" fill={lineStyle.stroke} opacity="0.6">
            <animateMotion
              dur="2s"
              repeatCount="indefinite"
              path={path}
              begin="0.5s"
            />
          </circle>
        </g>
      )}

      {/* Delay indicator */}
      {safeTransition.delay && safeTransition.delay > 0 && (
        <g transform={`translate(${midX - 30}, ${midY + 30})`}>
          <rect
            x="-15"
            y="-8"
            width="30"
            height="16"
            rx="8"
            fill="#FEF3C7"
            stroke="#F59E0B"
            strokeWidth="1"
            style={{ pointerEvents: "none" }}
          />
          <text
            textAnchor="middle"
            dy="3"
            style={{
              fontSize: "8px",
              fill: "#92400E",
              fontFamily: "Inter, sans-serif",
              fontWeight: "500",
              pointerEvents: "none",
            }}
          >
            {safeTransition.delay}s
          </text>
        </g>
      )}
    </g>
  );
};

export default ConnectionLine;
