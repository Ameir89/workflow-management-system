// src/components/WorkflowDesigner/PropertiesPanel/components/EmptyState.js
import React from "react";
import { useTranslation } from "react-i18next";
import { InformationCircleIcon } from "@heroicons/react/24/outline";

const EmptyState = ({
  icon: Icon = InformationCircleIcon,
  title,
  description,
  action,
}) => {
  const { t } = useTranslation();

  return (
    <div className="text-center py-8">
      <Icon className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-2 text-sm font-medium text-gray-900">
        {title || t("designer.noNodeSelected")}
      </h3>
      <p className="mt-1 text-sm text-gray-500">
        {description || t("designer.selectNodeToEdit")}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

export default EmptyState;
