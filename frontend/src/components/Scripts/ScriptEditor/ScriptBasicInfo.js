// src/components/Scripts/ScriptEditor/ScriptBasicInfo.js - Updated to handle categories and i18n
import React from "react";
import { useTranslation } from "react-i18next";

const ScriptBasicInfo = ({
  script,
  categories,
  onScriptChange,
  onTagsChange,
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">
        {t("scripts.basicInformation")}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("scripts.scriptName")} *
          </label>
          <input
            type="text"
            value={script.name}
            onChange={(e) => onScriptChange("name", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder={t("scripts.scriptNamePlaceholder")}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("scripts.language")} *
          </label>
          <select
            value={script.language}
            onChange={(e) => onScriptChange("language", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="javascript">
              {t("scripts.languages.javascript")}
            </option>
            <option value="python">{t("scripts.languages.python")}</option>
            <option value="sql">{t("scripts.languages.sql")}</option>
            <option value="shell">{t("scripts.languages.shell")}</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("scripts.category")} *
          </label>
          <select
            value={script.category}
            onChange={(e) => onScriptChange("category", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">{t("scripts.selectCategory")}</option>
            {Array.isArray(categories) && categories.length > 0 ? (
              categories.map((category) => (
                <option
                  key={category.category || category}
                  value={category.category || category}
                >
                  {category.category || category}
                </option>
              ))
            ) : (
              // Fallback options if categories are not loaded
              <>
                <option value="processing">
                  {t("scripts.categories.processing")}
                </option>
                <option value="validation">
                  {t("scripts.categories.validation")}
                </option>
                <option value="utility">
                  {t("scripts.categories.utility")}
                </option>
                <option value="automation">
                  {t("scripts.categories.automation")}
                </option>
              </>
            )}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("scripts.status")}
          </label>
          <select
            value={script.status}
            onChange={(e) => onScriptChange("status", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="active">{t("scripts.statuses.active")}</option>
            <option value="inactive">{t("scripts.statuses.inactive")}</option>
            <option value="draft">{t("scripts.statuses.draft")}</option>
          </select>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("scripts.description")}
        </label>
        <textarea
          value={script.description}
          onChange={(e) => onScriptChange("description", e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          placeholder={t("scripts.descriptionPlaceholder")}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("scripts.tags")}
        </label>
        <input
          type="text"
          value={script.tags?.join(", ") || ""}
          onChange={(e) => onTagsChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          placeholder={t("scripts.tagsPlaceholder")}
        />
        <p className="text-xs text-gray-500 mt-1">{t("scripts.tagsExample")}</p>
      </div>
    </div>
  );
};

export default ScriptBasicInfo;
