// src/components/Admin/NotificationManagement/utils/templateUtils.js
import React from "react";
import {
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  BellIcon,
} from "@heroicons/react/24/outline";

export const getChannelIcon = (channel) => {
  switch (channel) {
    case "email":
      return <EnvelopeIcon className="h-4 w-4" />;
    case "sms":
      return <DevicePhoneMobileIcon className="h-4 w-4" />;
    case "in_app":
      return <ComputerDesktopIcon className="h-4 w-4" />;
    default:
      return <BellIcon className="h-4 w-4" />;
  }
};

export const getStatusColor = (status) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800";
    case "inactive":
      return "bg-gray-100 text-gray-800";
    case "draft":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const getDeliveryStatusColor = (status) => {
  switch (status) {
    case "delivered":
      return "text-green-600";
    case "failed":
      return "text-red-600";
    case "pending":
      return "text-yellow-600";
    default:
      return "text-gray-600";
  }
};

export const formatUsageCount = (count) => {
  if (!count) return "0";
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

export const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString();
};

export const formatDateTime = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleString();
};
