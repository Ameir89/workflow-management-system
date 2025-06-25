// src/components/Notifications/Templates/components/ContentTab.js
import React from "react";
import { useTranslation } from "react-i18next";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import FormField from "../../../Common/FormField";
import FormTextarea from "../../../Common/FormTextarea";

const ContentTab = ({ form, watchedValues, errors, variables }) => {
  const { t } = useTranslation();
  const { register } = form;

  return (
    <div className="space-y-6">
      {watchedValues.channel === "email" && (
        <FormField
          label={t("notifications.subject")}
          required
          error={errors.subject}
        >
          <input
            type="text"
            {...register("subject", {
              required:
                watchedValues.channel === "email"
                  ? t("notifications.subjectRequired")
                  : false,
            })}
            className={`form-input ${errors.subject ? "border-red-300" : ""}`}
            placeholder={t("notifications.subjectPlaceholder")}
          />
        </FormField>
      )}

      <FormField
        label={t("notifications.messageContent")}
        required
        error={errors.content}
      >
        <FormTextarea
          {...register("content", {
            required: t("notifications.contentRequired"),
            minLength: {
              value: 10,
              message: t("notifications.contentMinLength"),
            },
          })}
          rows={12}
          className={`font-mono text-sm ${
            errors.content ? "border-red-300" : ""
          }`}
          placeholder={t("notifications.contentPlaceholder")}
        />

        <VariableHelpSection variables={variables} />
      </FormField>
    </div>
  );
};

const VariableHelpSection = ({ variables }) => {
  const { t } = useTranslation();

  return (
    <div className="mt-2 p-3 bg-blue-50 rounded-md">
      <div className="flex">
        <InformationCircleIcon className="h-5 w-5 text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
        <div className="text-sm text-blue-700">
          <p className="font-medium">{t("notifications.variableHelp")}</p>
          <p className="mt-1">{t("notifications.variableHelpDesc")}</p>
          <div className="mt-2 space-x-2">
            {variables.slice(0, 3).map(
              (variable) =>
                variable.key && (
                  <code
                    key={variable.key}
                    className="bg-blue-100 px-1 py-0.5 rounded text-xs"
                  >
                    {`{{${variable.key}}}`}
                  </code>
                )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentTab;
