// src/components/Notifications/Templates/components/StylingTab.js
import React from "react";
import { useTranslation } from "react-i18next";
import FormField from "../../../Common/FormField";
import FormSelect from "../../../Common/FormSelect";

const StylingTab = ({ form, watchedValues }) => {
  const { t } = useTranslation();
  const { register } = form;

  if (watchedValues.channel !== "email") {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>{t("notifications.stylingOnlyForEmail")}</p>
      </div>
    );
  }

  const templateTypeOptions = [
    { value: "basic", label: t("notifications.templateTypeBasic") },
    { value: "modern", label: t("notifications.templateTypeModern") },
    { value: "minimal", label: t("notifications.templateTypeMinimal") },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">
        {t("notifications.emailStyling")}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormSelect
          label={t("notifications.templateType")}
          {...register("styling.template_type")}
          options={templateTypeOptions}
        />

        <FormField label={t("notifications.headerColor")}>
          <input
            type="color"
            {...register("styling.header_color")}
            className="mt-1 block w-full h-10 border border-gray-300 rounded-md"
          />
        </FormField>

        <FormField label={t("notifications.buttonColor")}>
          <input
            type="color"
            {...register("styling.button_color")}
            className="mt-1 block w-full h-10 border border-gray-300 rounded-md"
          />
        </FormField>

        <FormField label={t("notifications.footerText")}>
          <input
            type="text"
            {...register("styling.footer_text")}
            className="form-input"
            placeholder={t("notifications.footerTextPlaceholder")}
          />
        </FormField>
      </div>
    </div>
  );
};

export default StylingTab;
