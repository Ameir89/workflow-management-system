// src/components/WorkflowDesigner/PropertiesPanel/components/node-types/NotificationProperties.js
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import FormField from "../../../../../Common/FormField";
import FormSelect from "../../../../../Common/FormSelect";
import FormTextarea from "../../../../../Common/FormTextarea";
import PropertySection from "../../PropertySection";
import { notificationManagementService } from "../../../../../../services/notificationManagementService";

// Import sub-components
import TemplateSelector from "./components/TemplateSelector";
import CustomNotificationForm from "./components/CustomNotificationForm";
import NotificationTiming from "./components/NotificationTiming";
import DeliverySettings from "./components/DeliverySettings";
import ChannelSpecificSettings from "./components/ChannelSpecificSettings";

const NotificationProperties = ({ node, onPropertyChange }) => {
  const { t } = useTranslation();
  const properties = node.properties || {};
  console.log("NotificationProperties properties:", properties);
  // Fetch notification templates
  const { data: templatesData, isLoading: templatesLoading } = useQuery(
    ["notification-templates-for-workflow"],
    () =>
      notificationManagementService.getTemplates({
        is_active: true,
        limit: 100,
      }),
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000,
    }
  );

  // Get template details when one is selected
  const { data: selectedTemplateDetails } = useQuery(
    ["notification-template-details", properties.selectedTemplateId],
    () =>
      notificationManagementService.getTemplate(properties.selectedTemplateId),
    {
      enabled: !!properties.selectedTemplateId,
      keepPreviousData: true,
    }
  );

  const notificationModeOptions = [
    { value: "template", label: "Use Template" },
    { value: "custom", label: "Custom Message" },
  ];

  const handleRecipientsChange = (value) => {
    const recipients = value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    onPropertyChange("recipients", recipients);
  };

  return (
    <PropertySection title={t("designer.notificationProperties")}>
      <div className="space-y-6">
        {/* Notification Mode Selection */}
        <FormSelect
          label={t("designer.notificationMode")}
          value={properties.notificationMode || "template"}
          onChange={(e) => onPropertyChange("notificationMode", e.target.value)}
          options={notificationModeOptions}
        />
        {/* Template Mode */}
        {/* {properties.notificationMode !== "template" ? ( */}
        <TemplateSelector
          templatesData={templatesData}
          templatesLoading={templatesLoading}
          selectedTemplateName={properties?.template}
          selectedTemplateDetails={selectedTemplateDetails}
          templateVariableValues={properties.templateVariableValues}
          onPropertyChange={onPropertyChange}
        />
        {/* ) : ( */}
        {/* COMMENTED OUT - Custom Notification Form  - MAYBE LATER*/}
        {/* <CustomNotificationForm
          properties={properties}
          onPropertyChange={onPropertyChange}
        /> */}
        {/* )} */}
        {/* Recipients (Common for both modes) */}
        <FormField
          label={t("designer.recipients")}
          required
          help={t("designer.recipientsHelp")}
        >
          <FormTextarea
            value={properties.recipients?.join(", ") || ""}
            onChange={(e) => handleRecipientsChange(e.target.value)}
            rows={2}
            placeholder="user1@example.com, user2@example.com"
          />
        </FormField>
        {/* Channel-specific settings */}
        <ChannelSpecificSettings
          channel={properties.channel}
          properties={properties}
          onPropertyChange={onPropertyChange}
        />
        {/* Notification Timing */}
        <NotificationTiming
          properties={properties}
          onPropertyChange={onPropertyChange}
        />
        {/* Delivery Settings */}
        <DeliverySettings
          properties={properties}
          onPropertyChange={onPropertyChange}
        />
        {/* Help Information */}
        <div className="p-3 bg-blue-50 rounded-md">
          <div className="flex items-start">
            <InformationCircleIcon className="h-4 w-4 text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <h5 className="text-sm font-medium text-blue-900 mb-1">
                {t("designer.notificationTips")}
              </h5>
              <div className="text-xs text-blue-700 space-y-1">
                <p>• Use templates for consistent messaging across workflows</p>
                <p>
                  • Variables will be replaced with actual workflow data at
                  runtime
                </p>
                <p>
                  • Test your notifications with sample data before deploying
                </p>
                <p>• Consider recipient preferences and notification timing</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PropertySection>
  );
};

export default NotificationProperties;
