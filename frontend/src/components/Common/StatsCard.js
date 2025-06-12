import React from "react";
import { Link } from "react-router-dom";
import {
  ClipboardDocumentListIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChartPieIcon,
} from "@heroicons/react/24/outline";

const StatsCard = ({ title, value, icon, color = "blue", link, change }) => {
  const getIcon = (iconName) => {
    const iconMap = {
      "clipboard-list": ClipboardDocumentListIcon,
      clock: ClockIcon,
      "exclamation-triangle": ExclamationTriangleIcon,
      "chart-pie": ChartPieIcon,
    };
    const IconComponent = iconMap[iconName] || ClipboardDocumentListIcon;
    return <IconComponent className="h-8 w-8" />;
  };

  const getColorClasses = (colorName) => {
    const colorMap = {
      blue: "text-blue-600 bg-blue-100",
      green: "text-green-600 bg-green-100",
      yellow: "text-yellow-600 bg-yellow-100",
      red: "text-red-600 bg-red-100",
      purple: "text-purple-600 bg-purple-100",
      gray: "text-gray-600 bg-gray-100",
    };
    return colorMap[colorName] || colorMap.blue;
  };

  const CardContent = () => (
    <div className="stats-card">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
          {change && (
            <div className="flex items-center mt-2">
              <span
                className={`text-sm font-medium ${
                  change.type === "increase"
                    ? "text-green-600"
                    : change.type === "decrease"
                    ? "text-red-600"
                    : "text-gray-600"
                }`}
              >
                {change.value}
              </span>
              <span className="text-sm text-gray-500 ml-1">
                from last {change.period}
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${getColorClasses(color)}`}>
          {getIcon(icon)}
        </div>
      </div>
    </div>
  );

  if (link) {
    return (
      <Link to={link} className="block hover:shadow-md transition-shadow">
        <CardContent />
      </Link>
    );
  }

  return <CardContent />;
};

export default StatsCard;
