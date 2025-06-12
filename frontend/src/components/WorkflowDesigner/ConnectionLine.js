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
  const startX = from.x + 64; // Node width / 2
  const startY = from.y + 32; // Node height / 2
  const endX = to.x;
  const endY = to.y + 32;

  // Calculate control points for curved line
  const controlX1 = startX + (endX - startX) / 3;
  const controlY1 = startY;
  const controlX2 = startX + (2 * (endX - startX)) / 3;
  const controlY2 = endY;

  const path = `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`;

  return (
    <g>
      <path
        d={path}
        stroke={selected ? "#3B82F6" : "#6B7280"}
        strokeWidth="2"
        fill="none"
        className="cursor-pointer"
        onClick={() => onDelete()}
      />

      {/* Arrow head */}
      <polygon
        points={`${endX - 8},${endY - 4} ${endX},${endY} ${endX - 8},${
          endY + 4
        }`}
        fill={selected ? "#3B82F6" : "#6B7280"}
      />

      {/* Condition label */}
      {condition && (
        <text
          x={(startX + endX) / 2}
          y={(startY + endY) / 2 - 10}
          textAnchor="middle"
          className="text-xs fill-gray-600"
        >
          {condition.field}
        </text>
      )}
    </g>
  );
};

export default ConnectionLine;
