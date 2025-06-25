// src/components/Notifications/Templates/components/BasicInfoTab.js
import React from "react";
import { useTranslation } from "react-i18next";
import FormField from "../../../Common/FormField";
import FormSelect from "../../../Common/FormSelect";
import FormTextarea from "../../../Common/FormTextarea";
import FormCheckbox from "../../../Common/FormCheckbox";

const BasicInfoTab = ({ form, errors }) => {
  const { t } = useTranslation();
  const { register } = form;

  const channelOptions = [
    { value: "email", label: t("notifications.channelEmail") },
    { value: "sms", label: t("notifications.channelSMS") },
    { value: "in_app", label: t("notifications.channelInApp") },
  ];

  const categoryOptions = [
    { value: "task", label: t("notifications.categoryTask") },
    { value: "workflow", label: t("notifications.categoryWorkflow") },
    { value: "system", label: t("notifications.categorySystem") },
    { value: "reminder", label: t("notifications.categoryReminder") },
    { value: "alert", label: t("notifications.categoryAlert") },
  ];

  const languageOptions = [
    { value: "en", label: t("notifications.languageEnglish") },
    { value: "ar", label: t("notifications.languageArabic") },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label={t("notifications.templateName")}
          required
          error={errors.name}
        >
          <input
            type="text"
            {...register("name", {
              required: t("notifications.templateNameRequired"),
              minLength: {
                value: 3,
                message: t("notifications.templateNameMinLength"),
              },
            })}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
              errors.name ? "border-red-300" : "border-gray-300"
            }`}
            placeholder={t("notifications.templateNamePlaceholder")}
          />
        </FormField>

        <FormSelect
          label={t("notifications.channel")}
          required
          error={errors.channel}
          {...register("channel", {
            required: t("notifications.channelRequired"),
          })}
          options={channelOptions}
        />

        <FormSelect
          label={t("notifications.category")}
          {...register("category")}
          options={categoryOptions}
        />

        <FormSelect
          label={t("notifications.language")}
          {...register("language")}
          options={languageOptions}
        />
      </div>

      <FormField
        label={t("notifications.description")}
        help={t("notifications.descriptionHelp")}
      >
        <FormTextarea
          {...register("description")}
          rows={3}
          placeholder={t("notifications.descriptionPlaceholder")}
        />
      </FormField>

      <FormField
        label={t("notifications.tags")}
        help={t("notifications.tagsHelp")}
      >
        <input
          type="text"
          {...register("tags")}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder={t("notifications.tagsPlaceholder")}
        />
      </FormField>

      <FormCheckbox
        label={t("notifications.isActive")}
        {...register("is_active")}
      />
    </div>
  );
};

export default BasicInfoTab;
