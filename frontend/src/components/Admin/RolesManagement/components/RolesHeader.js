// src/components/Admin/RolesManagement/components/RolesHeader.js
import React from "react";
import { useTranslation } from "react-i18next";
import { PlusIcon } from "@heroicons/react/24/outline";

const RolesHeader = ({ onCreateRole }) => {
  const { t } = useTranslation();

  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t("admin.roles.title", "Roles & Permissions")}
        </h1>
        <p className="text-gray-600">
          {t("admin.roles.subtitle", "Manage user roles and their permissions")}
        </p>
      </div>
      <button
        onClick={onCreateRole}
        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
      >
        <PlusIcon className="h-4 w-4 mr-2" />
        {t("admin.roles.createNewRole", "Create New Role")}
      </button>
    </div>
  );
};

export default RolesHeader;
