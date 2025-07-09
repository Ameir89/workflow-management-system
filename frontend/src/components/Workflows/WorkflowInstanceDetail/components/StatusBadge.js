// src/components/Workflows/WorkflowInstanceDetail/components/StatusBadge.js
import React from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircleIcon as CheckCircleIconSolid,
  XCircleIcon as XCircleIconSolid,
  ClockIcon as ClockIconSolid,
  PlayIcon as PlayIconSolid,
  PauseIcon as PauseIconSolid,
  StopIcon,
  CalendarIcon,
} from "@heroicons/react/24/solid";

const StatusBadge = ({ status, size = "md" }) => {
  const { t } = useTranslation();

  const statusConfig = {
    pending: {
      color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      icon: ClockIconSolid,
      label: t("common.pending"),
    },
    running: {
      color: "bg-blue-100 text-blue-800 border-blue-200",
      icon: PlayIconSolid,
      label: t("common.running"),
    },
    completed: {
      color: "bg-green-100 text-green-800 border-green-200",
      icon: CheckCircleIconSolid,
      label: t("common.completed"),
    },
    failed: {
      color: "bg-red-100 text-red-800 border-red-200",
      icon: XCircleIconSolid,
      label: t("common.failed"),
    },
    cancelled: {
      color: "bg-gray-100 text-gray-800 border-gray-200",
      icon: StopIcon,
      label: t("common.cancelled"),
    },
    paused: {
      color: "bg-orange-100 text-orange-800 border-orange-200",
      icon: PauseIconSolid,
      label: t("workflows.paused"),
    },
    scheduled: {
      color: "bg-purple-100 text-purple-800 border-purple-200",
      icon: CalendarIcon,
      label: t("common.scheduled"),
    },
  };

  const config = statusConfig[status] || statusConfig.pending;
  const IconComponent = config.icon;
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-2 text-base",
  };

  return (
    <span
      className={`inline-flex items-center ${sizeClasses[size]} rounded-full font-medium border ${config.color}`}
    >
      <IconComponent
        className={`${
          size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4"
        } mr-1`}
      />
      {config.label}
    </span>
  );
};

export default StatusBadge;
