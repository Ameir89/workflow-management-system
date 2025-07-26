// src/components/Admin/NotificationManagement/components/NotificationStats.js
import React from "react";
import { useTranslation } from "react-i18next";
import {
  DocumentTextIcon as DocumentTextIconSolid,
  BellIcon as BellIconSolid,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";

const NotificationStats = ({ analytics }) => {
  const { t } = useTranslation();

  const stats = [
    {
      name: t("notifications.activeTemplates"),
      value: analytics.stats?.active_templates || 0,
      icon: DocumentTextIconSolid,
      color: "text-blue-500",
    },
    {
      name: t("notifications.sentToday"),
      value: analytics.stats?.sent_today || 0,
      icon: BellIconSolid,
      color: "text-green-500",
    },
    {
      name: t("notifications.deliveryRate"),
      value: `${analytics.stats?.delivery_rate || 0}%`,
      icon: CheckCircleIcon,
      color: "text-green-500",
    },
    {
      name: t("notifications.failedToday"),
      value: analytics.stats?.failed_today || 0,
      icon: XCircleIcon,
      color: "text-red-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <div
          key={stat.name}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
        >
          <div className="flex items-center">
            <stat.icon className={`h-8 w-8 ${stat.color}`} />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">{stat.name}</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stat.value}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationStats;
