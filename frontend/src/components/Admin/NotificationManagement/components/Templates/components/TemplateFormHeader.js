// src/components/Notifications/Templates/components/TemplateFormHeader.js
import React from "react";
import { useTranslation } from "react-i18next";
import {
  DocumentTextIcon as DocumentTextIconSolid,
  ArrowLeftIcon,
  PlayIcon,
  CloudArrowUpIcon,
} from "@heroicons/react/24/outline";

const TemplateFormHeader = ({
  isEditMode,
  onBack,
  onTest,
  onSubmit,
  isTestLoading,
  isSaveLoading,
  isDirty,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className="btn btn-outline btn-sm"
          type="button"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          {t("common.back")}
        </button>

        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <DocumentTextIconSolid className="h-8 w-8 text-indigo-600 mr-3" />
            {isEditMode
              ? t("notifications.editTemplate")
              : t("notifications.createTemplate")}
          </h1>
          <p className="text-gray-600">
            {isEditMode
              ? t("notifications.editTemplateDesc")
              : t("notifications.createTemplateDesc")}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {isEditMode && (
          <button
            onClick={onTest}
            disabled={isTestLoading}
            className="btn btn-outline"
            type="button"
          >
            {isTestLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
            ) : (
              <PlayIcon className="h-4 w-4 mr-2" />
            )}
            {t("notifications.sendTest")}
          </button>
        )}

        <button
          onClick={onSubmit}
          disabled={isSaveLoading || (!isDirty && isEditMode)}
          className="btn btn-primary"
          type="submit"
        >
          {isSaveLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
          ) : (
            <CloudArrowUpIcon className="h-4 w-4 mr-2" />
          )}
          {isEditMode ? t("common.update") : t("common.create")}
        </button>
      </div>
    </div>
  );
};

export default TemplateFormHeader;
