// src/components/Admin/RolesManagement/components/EmptyState.js
import React from "react";
import { useTranslation } from "react-i18next";
import { ShieldCheckIcon, PlusIcon } from "@heroicons/react/24/outline";

const EmptyState = ({ isFiltered, onCreateRole, onClearFilters }) => {
  const { t } = useTranslation();

  if (isFiltered) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          {t("admin.roles.noRolesFound", "No roles found")}
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          {t(
            "admin.roles.noRolesMatchFilter",
            "No roles match your search criteria."
          )}
        </p>
        <div className="mt-6">
          <button
            onClick={onClearFilters}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 transition-colors"
          >
            {t("common.clearFilters", "Clear Filters")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
      <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-2 text-sm font-medium text-gray-900">
        {t("admin.roles.noRoles", "No roles")}
      </h3>
      <p className="mt-1 text-sm text-gray-500">
        {t(
          "admin.roles.getStartedMessage",
          "Get started by creating your first role."
        )}
      </p>
      <div className="mt-6">
        <button
          onClick={onCreateRole}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          {t("admin.roles.createFirstRole", "Create Your First Role")}
        </button>
      </div>
    </div>
  );
};

export default EmptyState;
