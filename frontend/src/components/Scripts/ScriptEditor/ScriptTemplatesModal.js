// src/components/Scripts/ScriptEditor/ScriptTemplatesModal.js - Updated for API response and i18n
import React from "react";
import { useTranslation } from "react-i18next";
import { XMarkIcon, BookOpenIcon } from "@heroicons/react/24/outline";

const ScriptTemplatesModal = ({
  isOpen,
  onClose,
  templates,
  scriptLanguage,
  onTemplateSelect,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  // Filter templates by language - handle both script_type and language fields
  const filteredTemplates = templates?.filter(
    (t) => (t.script_type || t.language) === scriptLanguage
  );

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            {t("scripts.templates.scriptTemplates")}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
          {filteredTemplates && filteredTemplates.length > 0 ? (
            filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 cursor-pointer transition-colors"
                onClick={() => onTemplateSelect(template)}
              >
                <h4 className="font-medium text-gray-900">{template.name}</h4>
                <p className="text-sm text-gray-600 mt-1">
                  {template.description}
                </p>
                <div className="mt-2 flex items-center space-x-2">
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">
                    {template.script_type || template.language}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                    {template.category}
                  </span>
                  {template.is_template && (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                      {t("scripts.templates.template")}
                    </span>
                  )}
                </div>

                {/* Preview of script content */}
                {template.script_content && (
                  <div className="mt-3 bg-gray-50 p-2 rounded text-xs">
                    <pre className="text-gray-700 truncate">
                      {template.script_content.substring(0, 100)}
                      {template.script_content.length > 100 ? "..." : ""}
                    </pre>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center py-8 text-gray-500">
              <BookOpenIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {t("scripts.templates.noTemplatesAvailable")}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {t("scripts.templates.noTemplatesForLanguage", {
                  language: scriptLanguage,
                })}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            {t("scripts.templates.close")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScriptTemplatesModal;
