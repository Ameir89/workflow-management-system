import React from "react";
import { useTranslation } from "react-i18next";
import FormField from "../../../../../components/Common/FormField";
import FormSelect from "../../../../../components/Common/FormSelect";
import FormTextarea from "../../../../../components/Common/FormTextarea";
import PropertySection from "../PropertySection";

const ApprovalProperties = ({ node, onPropertyChange }) => {
  const { t } = useTranslation();
  const properties = node.properties || {};

  const approvalTypeOptions = [
    { value: "any", label: t("designer.anyApprover") },
    { value: "all", label: t("designer.allApprovers") },
    { value: "majority", label: t("designer.majority") },
    { value: "sequential", label: t("designer.sequential") },
  ];

  const handleApproversChange = (value) => {
    const approvers = value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    onPropertyChange("approvers", approvers);
  };

  return (
    <PropertySection title={t("designer.approvalProperties")}>
      <div className="space-y-4">
        <FormField
          label={t("designer.approvers")}
          required
          help={t("designer.approversHelp")}
        >
          <FormTextarea
            value={properties.approvers?.join(", ") || ""}
            onChange={(e) => handleApproversChange(e.target.value)}
            rows={2}
            placeholder="user1@example.com, user2@example.com"
          />
        </FormField>

        <FormSelect
          label={t("designer.approvalType")}
          value={properties.approvalType || "any"}
          onChange={(e) => onPropertyChange("approvalType", e.target.value)}
          options={approvalTypeOptions}
        />

        <FormField
          label={t("designer.dueHours")}
          help={t("designer.approvalDueHoursHelp")}
        >
          <input
            type="number"
            value={properties.dueHours || 48}
            onChange={(e) =>
              onPropertyChange("dueHours", parseInt(e.target.value) || 48)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            min="1"
            max="8760"
          />
        </FormField>

        <FormField label={t("designer.approvalReason")}>
          <FormTextarea
            value={properties.reason || ""}
            onChange={(e) => onPropertyChange("reason", e.target.value)}
            rows={3}
            placeholder={t("designer.approvalReasonPlaceholder")}
          />
        </FormField>

        {/* Approval Type Info */}
        <div className="p-3 bg-gray-50 rounded-md">
          <h5 className="text-sm font-medium text-gray-900 mb-2">
            {t("designer.approvalTypeInfo")}
          </h5>
          <div className="text-xs text-gray-600 space-y-1">
            <p>
              <strong>{t("designer.any")}:</strong>{" "}
              {t("designer.anyApproverDesc")}
            </p>
            <p>
              <strong>{t("designer.all")}:</strong>{" "}
              {t("designer.allApproversDesc")}
            </p>
            <p>
              <strong>{t("designer.majority")}:</strong>{" "}
              {t("designer.majorityDesc")}
            </p>
            <p>
              <strong>{t("designer.sequential")}:</strong>{" "}
              {t("designer.sequentialDesc")}
            </p>
          </div>
        </div>
      </div>
    </PropertySection>
  );
};

export default ApprovalProperties;
