// src/components/Admin/RolesManagement/components/ViewToggle.js
import React from "react";
import { useTranslation } from "react-i18next";
import { Squares2X2Icon, ListBulletIcon } from "@heroicons/react/24/outline";

const ViewToggle = ({ viewMode, onViewModeChange }) => {
  const { t } = useTranslation();

  const views = [
    {
      id: "grid",
      icon: Squares2X2Icon,
      label: t("common.gridView"),
      title: t("admin.roles.gridViewTooltip", "Display roles as cards"),
    },
    {
      id: "list",
      icon: ListBulletIcon,
      label: t("common.listView"),
      title: t("admin.roles.listViewTooltip", "Display roles as table"),
    },
  ];

  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-1">
      {views.map((view) => {
        const Icon = view.icon;
        const isActive = viewMode === view.id;

        return (
          <button
            key={view.id}
            onClick={() => onViewModeChange(view.id)}
            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
            title={view.title}
            aria-label={view.label}
          >
            <Icon className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">{view.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ViewToggle;
