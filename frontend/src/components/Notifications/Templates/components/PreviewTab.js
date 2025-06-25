// src/components/Notifications/Templates/components/PreviewTab.js
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

const PreviewTab = ({ form, watchedValues, variables }) => {
  const { t } = useTranslation();
  const { trigger } = form;

  const preview = useMemo(() => {
    let content = watchedValues.content || "";
    variables.forEach((variable) => {
      if (variable.key && variable.example) {
        const placeholder = new RegExp(`{{\\s*${variable.key}\\s*}}`, "g");
        content = content.replace(placeholder, variable.example);
      }
    });
    return content;
  }, [watchedValues.content, variables]);

  return (
    <div className="space-y-6">
      <PreviewHeader onRefresh={() => trigger()} />

      <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
        {watchedValues.channel === "email" && (
          <EmailSubjectPreview subject={watchedValues.subject} />
        )}

        <ContentPreview content={preview} />

        {variables.length > 0 && (
          <VariablesUsedIndicator variables={variables} />
        )}
      </div>

      <PreviewNote />
    </div>
  );
};

const PreviewHeader = ({ onRefresh }) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-medium text-gray-900">
        {t("notifications.templatePreview")}
      </h3>
      <button
        type="button"
        onClick={onRefresh}
        className="btn btn-outline btn-sm"
      >
        <ArrowPathIcon className="h-4 w-4 mr-2" />
        {t("notifications.refreshPreview")}
      </button>
    </div>
  );
};

const EmailSubjectPreview = ({ subject }) => {
  const { t } = useTranslation();

  return (
    <div className="mb-4 p-3 bg-white rounded border">
      <div className="text-sm text-gray-600 mb-1">
        {t("notifications.subject")}:
      </div>
      <div className="font-medium">
        {subject || t("notifications.noSubject")}
      </div>
    </div>
  );
};

const ContentPreview = ({ content }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded border p-4">
      <div className="prose max-w-none">
        {content ? (
          <div
            className="whitespace-pre-wrap"
            dangerouslySetInnerHTML={{
              __html: content.replace(/\n/g, "<br>"),
            }}
          />
        ) : (
          <div className="text-gray-500 italic">
            {t("notifications.noContent")}
          </div>
        )}
      </div>
    </div>
  );
};

const VariablesUsedIndicator = ({ variables }) => {
  const { t } = useTranslation();

  return (
    <div className="mt-4 p-3 bg-blue-50 rounded">
      <h4 className="text-sm font-medium text-blue-900 mb-2">
        {t("notifications.variablesUsed")}:
      </h4>
      <div className="flex flex-wrap gap-2">
        {variables.map(
          (variable) =>
            variable.key && (
              <span
                key={variable.key}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {variable.key}:{" "}
                {variable.example || t("notifications.noExample")}
              </span>
            )
        )}
      </div>
    </div>
  );
};

const PreviewNote = () => {
  const { t } = useTranslation();

  return (
    <div className="text-sm text-gray-600">
      <p>{t("notifications.previewNote")}</p>
    </div>
  );
};

export default PreviewTab;
