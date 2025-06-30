// src/components/Admin/RolesManagement/components/RolesSummary.js
import React from "react";
import { useTranslation } from "react-i18next";

const RolesSummary = ({ summary, permissionsCount }) => {
  const { t } = useTranslation();

  if (!summary) {
    return null;
  }

  const summaryItems = [
    {
      label: t("admin.roles.totalRoles", "Total Roles"),
      value: summary.total || 0,
      color: "text-gray-900",
    },
    {
      label: t("admin.roles.activeRoles", "Active Roles"),
      value: summary.active || 0,
      color: "text-green-600",
    },
    {
      label: t("admin.roles.systemRoles", "System Roles"),
      value: summary.system || 0,
      color: "text-purple-600",
    },
    {
      label: t("admin.roles.availablePermissions", "Available Permissions"),
      value: permissionsCount,
      color: "text-blue-600",
    },
  ];

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        {summaryItems.map((item, index) => (
          <div key={index} className="space-y-1">
            <div className={`text-2xl font-bold ${item.color}`}>
              {item.value}
            </div>
            <div className="text-sm text-gray-500">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RolesSummary;
