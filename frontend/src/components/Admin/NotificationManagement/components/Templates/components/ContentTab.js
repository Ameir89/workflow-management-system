// src/components/Admin/NotificationManagement/components/Templates/components/ContentTab.js
import React from "react";
import { useTranslation } from "react-i18next";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import FormField from "../../../../../Common/FormField";

const ContentTab = ({ form, watchedValues, errors, variables }) => {
  const { t } = useTranslation();
  const { register } = form;

  return (
    <div className="space-y-6">
      {/* Subject field - only show for email channel */}
      {watchedValues.channel === "email" && (
        <FormField
          label={t("notifications.subject")}
          required
          error={errors.subject}
          help={t("notifications.subjectHelp")}
        >
          <input
            type="text"
            {...register("subject", {
              required:
                watchedValues.channel === "email"
                  ? t("notifications.subjectRequired")
                  : false,
            })}
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
              errors.subject ? "border-red-300" : "border-gray-300"
            }`}
            placeholder={t("notifications.subjectPlaceholder")}
          />
        </FormField>
      )}

      {/* Message Content */}
      <FormField
        label={t("notifications.messageContent")}
        required
        error={errors.content}
        help={t("notifications.contentHelp")}
      >
        <textarea
          {...register("content", {
            required: t("notifications.contentRequired"),
            minLength: {
              value: 10,
              message: t("notifications.contentMinLength"),
            },
          })}
          rows={12}
          className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm ${
            errors.content ? "border-red-300" : "border-gray-300"
          }`}
          placeholder={t("notifications.contentPlaceholder")}
        />

        <VariableHelpSection variables={variables} />
      </FormField>

      {/* Template Syntax Help */}
      <TemplateSyntaxHelp />
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
          {variables.length > 0 && (
            <div className="mt-2 space-x-2">
              <span className="text-xs font-medium">Available variables:</span>
              {variables.slice(0, 5).map(
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
              {variables.length > 5 && (
                <span className="text-xs text-blue-600">
                  +{variables.length - 5} more...
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TemplateSyntaxHelp = () => {
  const { t } = useTranslation();

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <h4 className="text-sm font-medium text-gray-900 mb-3">
        {t("notifications.templateSyntax")}
      </h4>
      <div className="space-y-2 text-sm text-gray-600">
        <div>
          <code className="bg-gray-200 px-1 py-0.5 rounded text-xs mr-2">
            {"{{variable_name}}"}
          </code>
          <span>{t("notifications.variableSyntax")}</span>
        </div>
        <div>
          <code className="bg-gray-200 px-1 py-0.5 rounded text-xs mr-2">
            {"{{#variable}}content{{/variable}}"}
          </code>
          <span>{t("notifications.loopSyntax")}</span>
        </div>
        <div>
          <code className="bg-gray-200 px-1 py-0.5 rounded text-xs mr-2">
            {"{{^variable}}content{{/variable}}"}
          </code>
          <span>{t("notifications.inverseLoopSyntax")}</span>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-3">
        {t("notifications.templateSyntaxDesc")}
      </p>
    </div>
  );
};

export default ContentTab;
