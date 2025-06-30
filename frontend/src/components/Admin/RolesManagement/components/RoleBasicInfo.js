// src/components/Admin/RolesManagement/components/RoleBasicInfo.js
import React from "react";
import { useTranslation } from "react-i18next";

const RoleBasicInfo = ({ formData, errors, onChange }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <h4 className="text-md font-medium text-gray-900 border-b border-gray-200 pb-2">
        {t("admin.roles.basicInformation", "Basic Information")}
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Role Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("admin.roles.roleName", "Role Name")} *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => onChange("name", e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              errors.name
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-indigo-500"
            }`}
            placeholder={t(
              "admin.roles.roleNamePlaceholder",
              "e.g., Workflow Manager"
            )}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        {/* Active Status */}
        <div className="flex items-center mt-6">
          <input
            type="checkbox"
            id="is_active"
            checked={formData.is_active}
            onChange={(e) => onChange("is_active", e.target.checked)}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label
            htmlFor="is_active"
            className="ml-2 block text-sm text-gray-900"
          >
            {t("admin.roles.activeRole", "Active Role")}
          </label>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("common.description", "Description")}
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => onChange("description", e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder={t(
            "admin.roles.descriptionPlaceholder",
            "Describe what this role is for..."
          )}
        />
      </div>
    </div>
  );
};

export default RoleBasicInfo;
