// src/components/Workflows/WorkflowInstanceDetail/components/ApprovalBadge.js
import React from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/solid";

const ApprovalBadge = ({ instanceData, size = "md" }) => {
  const { t } = useTranslation();

  // Extract approval data from instance data
  const approvalStatus = instanceData?.data?.approval_status;
  const approvalDecision = instanceData?.data?.approval_decision;
  const approvedBy = instanceData?.data?.approved_by_name;
  const rejectedBy = instanceData?.data?.rejected_by_name;
  const approvedAt = instanceData?.data?.approved_at;
  const rejectedAt = instanceData?.data?.rejected_at;
  const rejectionReason = instanceData?.data?.rejection_reason;

  // Don't show badge if no approval status
  if (!approvalStatus && !approvalDecision) {
    return null;
  }

  const getApprovalConfig = () => {
    // Handle different approval states
    if (approvalStatus === "approved" || approvalDecision === "approve") {
      return {
        color: "bg-green-100 text-green-800 border-green-200",
        icon: CheckCircleIcon,
        label: t("workflows.approved"),
        details:
          approvedBy && approvedAt
            ? {
                user: approvedBy,
                timestamp: new Date(approvedAt).toLocaleString(),
              }
            : null,
      };
    }

    if (approvalStatus === "rejected" || approvalDecision === "reject") {
      return {
        color: "bg-red-100 text-red-800 border-red-200",
        icon: XCircleIcon,
        label: t("workflows.rejected"),
        details:
          rejectedBy && rejectedAt
            ? {
                user: rejectedBy,
                timestamp: new Date(rejectedAt).toLocaleString(),
                reason: rejectionReason,
              }
            : null,
      };
    }

    if (approvalStatus === "pending") {
      return {
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        icon: ClockIcon,
        label: t("workflows.pendingApproval"),
        details: null,
      };
    }

    // Default fallback
    return {
      color: "bg-gray-100 text-gray-800 border-gray-200",
      icon: ExclamationCircleIcon,
      label: t("workflows.approvalRequired"),
      details: null,
    };
  };

  const config = getApprovalConfig();
  const IconComponent = config.icon;

  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-2 text-base",
  };

  return (
    <div className="space-y-2">
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

      {/* Additional details for approved/rejected instances */}
      {config.details && (
        <div className="text-xs text-gray-600 space-y-1">
          <div>
            {approvalStatus === "approved"
              ? t("workflows.approvedBy", { user: config.details.user })
              : t("workflows.rejectedBy", { user: config.details.user })}
          </div>
          <div className="text-gray-500">{config.details.timestamp}</div>
          {config.details.reason && (
            <div className="text-red-600 font-medium">
              {t("workflows.rejectionReason")}: {config.details.reason}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ApprovalBadge;
