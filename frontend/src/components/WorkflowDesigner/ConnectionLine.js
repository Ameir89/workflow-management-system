import React from "react";

const ConnectionLine = ({
  id,
  from,
  to,
  condition,
  selected,
  onDelete,
  zoom,
}) => {
  // Calculate start and end points
  const startX = from.x + 64; // Half of node width
  const startY = from.y + 24; // Half of node height
  const endX = to.x;
  const endY = to.y + 24;

  // Calculate control points for curved line
  const controlX1 = startX + (endX - startX) / 3;
  const controlY1 = startY;
  const controlX2 = startX + (2 * (endX - startX)) / 3;
  const controlY2 = endY;

  const path = `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`;

  return (
    <g className="connection-line">
      {/* Invisible wider path for easier clicking */}
      <path
        d={path}
        stroke="transparent"
        strokeWidth="20"
        fill="none"
        className="cursor-pointer"
        onClick={() => onDelete()}
      />

      {/* Visible path */}
      <path
        d={path}
        stroke={selected ? "#3B82F6" : "#6B7280"}
        strokeWidth="2"
        fill="none"
        className="pointer-events-none"
      />

      {/* Arrow head */}
      <polygon
        points={`${endX - 8},${endY - 4} ${endX},${endY} ${endX - 8},${
          endY + 4
        }`}
        fill={selected ? "#3B82F6" : "#6B7280"}
        className="pointer-events-none"
      />

      {/* Condition label */}
      {condition && (
        <g>
          <rect
            x={(startX + endX) / 2 - 40}
            y={(startY + endY) / 2 - 20}
            width="80"
            height="20"
            rx="10"
            fill="white"
            stroke="#E5E7EB"
            strokeWidth="1"
          />
          <text
            x={(startX + endX) / 2}
            y={(startY + endY) / 2 - 5}
            textAnchor="middle"
            className="text-xs fill-gray-600 pointer-events-none"
          >
            {condition.field}
          </text>
        </g>
      )}
    </g>
  );
};

export default ConnectionLine;
