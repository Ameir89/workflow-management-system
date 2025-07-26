// src/components/Admin/NotificationManagement/components/Templates/components/BasicInfoTab.js
import React from "react";
import { useTranslation } from "react-i18next";
import FormField from "../../../../../Common/FormField";

const BasicInfoTab = ({ form, errors }) => {
  const { t } = useTranslation();
  const { register } = form;

  // Watch the channel value to show/hide subject field

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

        <FormField
          label={t("notifications.channel")}
          required
          error={errors.channel}
        >
          <select
            {...register("channel", {
              required: t("notifications.channelRequired"),
            })}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
              errors.channel ? "border-red-300" : "border-gray-300"
            }`}
          >
            {channelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label={t("notifications.category")}>
          <select
            {...register("category")}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label={t("notifications.language")}>
          <select
            {...register("language")}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            {languageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField
        label={t("notifications.description")}
        help={t("notifications.descriptionHelp")}
      >
        <textarea
          {...register("description")}
          rows={3}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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

      <div className="flex items-center">
        <input
          type="checkbox"
          {...register("is_active")}
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
        />
        <label className="ml-2 block text-sm text-gray-900">
          {t("notifications.isActive")}
        </label>
      </div>
    </div>
  );
};

export default BasicInfoTab;
