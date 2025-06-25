// src/components/Admin/UserManagement/StatusBadge.js
import React from "react";
import {
  CheckCircleIcon,
  XCircleIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

const StatusBadge = ({ isActive, isVerified, twoFaEnabled, t }) => {
  return (
    <div className="flex items-center space-x-1">
      {isActive ? (
        <CheckCircleIcon
          className="h-4 w-4 text-green-500"
          title={t("admin.users.active")}
        />
      ) : (
        <XCircleIcon
          className="h-4 w-4 text-red-500"
          title={t("admin.users.inactive")}
        />
      )}
      {isVerified && (
        <ShieldCheckIcon
          className="h-4 w-4 text-blue-500"
          title={t("admin.users.verified")}
        />
      )}
      {twoFaEnabled && (
        <span
          className="text-xs bg-green-100 text-green-800 px-1 rounded"
          title={t("admin.users.twoFaEnabled")}
        >
          2FA
        </span>
      )}
    </div>
  );
};

export default StatusBadge;
