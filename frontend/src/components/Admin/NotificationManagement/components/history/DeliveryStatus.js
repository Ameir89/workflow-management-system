// src/components/Admin/NotificationManagement/components/History/DeliveryStatus.js
import React from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

const DeliveryStatus = ({ status, showText = false }) => {
  const { t } = useTranslation();

  const getStatusConfig = (status) => {
    switch (status) {
      case "delivered":
        return {
          icon: CheckCircleIcon,
          color: "text-green-600",
          bgColor: "bg-green-100",
          text: t("notifications.delivered"),
        };
      case "failed":
        return {
          icon: XCircleIcon,
          color: "text-red-600",
          bgColor: "bg-red-100",
          text: t("notifications.failed"),
        };
      case "pending":
        return {
          icon: ClockIcon,
          color: "text-yellow-600",
          bgColor: "bg-yellow-100",
          text: t("notifications.pending"),
        };
      default:
        return {
          icon: ExclamationTriangleIcon,
          color: "text-gray-600",
          bgColor: "bg-gray-100",
          text: status,
        };
    }
  };

  const config = getStatusConfig(status);
  const IconComponent = config.icon;

  if (showText) {
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}
      >
        <IconComponent className="h-3 w-3 mr-1" />
        {config.text}
      </span>
    );
  }

  return <IconComponent className={`h-4 w-4 ${config.color}`} />;
};

export default DeliveryStatus;
