// src/components/Notifications/Templates/NotificationTemplateForm.js
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useForm } from "react-hook-form";
import { notificationManagementService } from "../../../services/notificationManagementService";

// Components
import TemplateFormHeader from "./components/TemplateFormHeader";
import TemplateFormTabs from "./components/TemplateFormTabs";
import BasicInfoTab from "./components/BasicInfoTab";
import ContentTab from "./components/ContentTab";
import VariablesTab from "./components/VariablesTab";
import StylingTab from "./components/StylingTab";
import PreviewTab from "./components/PreviewTab";
import UnsavedChangesWarning from "./components/UnsavedChangesWarning";
import LoadingSpinner from "../../Common/LoadingSpinner";
import ErrorDisplay from "../../Common/ErrorDisplay";

// Hooks and utilities
import { useTemplateVariables } from "./hooks/useTemplateVariables";
import { useUnsavedChanges } from "./hooks/useUnsavedChanges";
import {
  getDefaultFormValues,
  validateFormData,
} from "./utils/templateFormUtils";

const NotificationTemplateForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEditMode = Boolean(id);

  const [activeTab, setActiveTab] = useState("basic");

  // Form setup
  const form = useForm({
    defaultValues: getDefaultFormValues(),
    mode: "onChange",
  });

  const {
    watch,
    reset,
    handleSubmit,
    formState: { errors, isDirty },
  } = form;
  const watchedValues = watch();

  // Custom hooks
  const {
    variables,
    addVariable,
    updateVariable,
    removeVariable,
    setVariables,
  } = useTemplateVariables();
  const { showUnsavedWarning, handleNavigation } = useUnsavedChanges(isDirty);

  // Fetch template for editing
  const {
    data: templateData,
    isLoading,
    error: fetchError,
  } = useQuery(
    ["notification-template", id],
    () => notificationManagementService.getTemplate(id),
    {
      enabled: isEditMode,
      onSuccess: (data) => {
        const template = data.template || data;
        reset({
          ...template,
          tags: template.tags?.join(", ") || "",
        });

        if (template.variables) {
          const varsArray = Object.entries(template.variables).map(
            ([key, value]) => ({
              key,
              description: value.description || "",
              example: value.example || "",
            })
          );
          setVariables(varsArray);
        }
      },
      onError: (error) => {
        toast.error(t("notifications.errorFetchingTemplate"));
        navigate(-1);
      },
    }
  );

  // Mutations
  const templateMutation = useMutation(
    (templateData) => {
      if (isEditMode) {
        return notificationManagementService.updateTemplate(id, templateData);
      }
      return notificationManagementService.createTemplate(templateData);
    },
    {
      onSuccess: () => {
        toast.success(
          isEditMode
            ? t("notifications.templateUpdated")
            : t("notifications.templateCreated")
        );
        queryClient.invalidateQueries(["notification-templates"]);
        navigate(-1);
      },
      onError: (error) => {
        toast.error(error.message || t("notifications.errorSavingTemplate"));
      },
    }
  );

  const testMutation = useMutation(
    (testData) => notificationManagementService.testTemplate(id, testData),
    {
      onSuccess: () => {
        toast.success(t("notifications.testSent"));
      },
      onError: (error) => {
        toast.error(error.message || t("notifications.errorSendingTest"));
      },
    }
  );

  // Form submission
  const onSubmit = useCallback(
    async (data) => {
      const validationErrors = validateFormData(data, variables, t);

      if (validationErrors.length > 0) {
        validationErrors.forEach((error) => toast.error(error));
        return;
      }

      const formattedData = {
        ...data,
        tags: data.tags
          ? data.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean)
          : [],
        variables: variables.reduce((acc, variable) => {
          if (variable.key) {
            acc[variable.key] = {
              description: variable.description || "",
              example: variable.example || "",
            };
          }
          return acc;
        }, {}),
      };

      templateMutation.mutate(formattedData);
    },
    [variables, templateMutation, t]
  );

  // Test functionality
  const handleTest = useCallback(() => {
    if (!isEditMode) {
      toast.warning(t("notifications.saveBeforeTest"));
      return;
    }

    const testData = {
      recipient: "test@example.com",
      variables: variables.reduce((acc, variable) => {
        if (variable.key && variable.example) {
          acc[variable.key] = variable.example;
        }
        return acc;
      }, {}),
    };

    testMutation.mutate(testData);
  }, [isEditMode, variables, testMutation, t]);

  // Loading state
  if (isLoading) {
    return <LoadingSpinner message={t("common.loading")} />;
  }

  // Error state
  if (fetchError) {
    return (
      <ErrorDisplay
        title={t("notifications.errorLoadingTemplate")}
        message={fetchError.message}
        onBack={() => navigate(-1)}
      />
    );
  }

  const tabProps = {
    form,
    watchedValues,
    errors,
    variables,
    addVariable,
    updateVariable,
    removeVariable,
    isEditMode,
  };

  return (
    <div className="space-y-6">
      <TemplateFormHeader
        isEditMode={isEditMode}
        onBack={() => handleNavigation(() => navigate(-1))}
        onTest={handleTest}
        onSubmit={handleSubmit(onSubmit)}
        isTestLoading={testMutation.isLoading}
        isSaveLoading={templateMutation.isLoading}
        isDirty={isDirty}
      />

      {showUnsavedWarning && <UnsavedChangesWarning />}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <TemplateFormTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            errors={errors}
            channel={watchedValues.channel}
          />

          <div className="p-6">
            {activeTab === "basic" && <BasicInfoTab {...tabProps} />}
            {activeTab === "content" && <ContentTab {...tabProps} />}
            {activeTab === "variables" && <VariablesTab {...tabProps} />}
            {activeTab === "styling" && <StylingTab {...tabProps} />}
            {activeTab === "preview" && <PreviewTab {...tabProps} />}
          </div>
        </div>
      </form>
    </div>
  );
};

export default NotificationTemplateForm;
