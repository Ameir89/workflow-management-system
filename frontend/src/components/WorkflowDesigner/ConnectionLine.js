import React, { useState } from "react";

const ConnectionLine = ({
  id,
  from,
  to,
  condition,
  selected,
  onDelete,
  zoom,
}) => {
  const [isHovered, setIsHovered] = useState(false);

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

  // Calculate angle for arrow rotation
  const angle =
    Math.atan2(endY - controlY2, endX - controlX2) * (180 / Math.PI);

  return (
    <g
      className="connection-line-group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Invisible wider path for easier clicking */}
      <path
        d={path}
        stroke="transparent"
        strokeWidth="20"
        fill="none"
        className="cursor-pointer"
        onClick={() => onDelete()}
        style={{ pointerEvents: "stroke" }}
      />

      {/* Main connection line */}
      <path
        d={path}
        stroke={selected ? "#3B82F6" : isHovered ? "#4F46E5" : "#6B7280"}
        strokeWidth={selected || isHovered ? "3" : "2"}
        fill="none"
        className="connection-line"
        markerEnd={`url(#${
          selected || isHovered ? "arrowhead-selected" : "arrowhead"
        })`}
        style={{
          transition: "all 0.2s ease",
          filter: isHovered
            ? "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))"
            : "none",
        }}
      />

      {/* Connection line glow effect when selected */}
      {(selected || isHovered) && (
        <path
          d={path}
          stroke={selected ? "#3B82F6" : "#4F46E5"}
          strokeWidth="6"
          fill="none"
          opacity="0.3"
          className="connection-line-glow"
          style={{ filter: "blur(2px)" }}
        />
      )}

      {/* Condition label */}
      {condition && (
        <g transform={`translate(${midX}, ${midY})`}>
          {/* Label background */}
          <rect
            x="-45"
            y="-12"
            width="90"
            height="24"
            rx="12"
            fill="white"
            stroke={selected ? "#3B82F6" : "#E5E7EB"}
            strokeWidth={selected ? "2" : "1"}
            className="condition-label-bg"
            style={{
              filter: "drop-shadow(0 1px 3px rgba(0, 0, 0, 0.1))",
              transition: "all 0.2s ease",
            }}
          />

          {/* Condition text */}
          <text
            textAnchor="middle"
            dy="4"
            className="condition-label-text"
            style={{
              fontSize: "11px",
              fontWeight: "500",
              fill: selected ? "#1E40AF" : "#374151",
              fontFamily: "Inter, sans-serif",
            }}
          >
            {condition.field}
          </text>

          {/* Condition operator/value */}
          {condition.operator && condition.value && (
            <text
              textAnchor="middle"
              dy="15"
              className="condition-details-text"
              style={{
                fontSize: "9px",
                fill: "#6B7280",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {`${condition.operator} ${condition.value}`}
            </text>
          )}
        </g>
      )}

      {/* Hover indicators */}
      {isHovered && (
        <>
          {/* Start point indicator */}
          <circle
            cx={startX}
            cy={startY}
            r="4"
            fill="#3B82F6"
            stroke="white"
            strokeWidth="2"
            className="connection-indicator"
            style={{
              filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))",
            }}
          />

          {/* End point indicator */}
          <circle
            cx={endX}
            cy={endY}
            r="4"
            fill="#3B82F6"
            stroke="white"
            strokeWidth="2"
            className="connection-indicator"
            style={{
              filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))",
            }}
          />

          {/* Delete button */}
          <g transform={`translate(${midX}, ${midY - 30})`}>
            <circle
              cx="0"
              cy="0"
              r="12"
              fill="#EF4444"
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              style={{
                filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))",
              }}
            />
            <text
              textAnchor="middle"
              dy="4"
              style={{
                fontSize: "12px",
                fontWeight: "bold",
                fill: "white",
                cursor: "pointer",
              }}
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              ×
            </text>
          </g>
        </>
      )}

      {/* Flow direction indicator */}
      {(selected || isHovered) && (
        <g>
          {/* Animated flow dots */}
          <circle r="2" fill={selected ? "#3B82F6" : "#4F46E5"} opacity="0.8">
            <animateMotion dur="2s" repeatCount="indefinite" path={path} />
          </circle>
          <circle r="2" fill={selected ? "#3B82F6" : "#4F46E5"} opacity="0.6">
            <animateMotion
              dur="2s"
              repeatCount="indefinite"
              path={path}
              begin="0.5s"
            />
          </circle>
        </g>
      )}
    </g>
  );
};

export default ConnectionLine;
