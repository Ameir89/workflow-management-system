// src/components/Admin/RolesManagement/components/RoleCard.js
import React from "react";
import { useTranslation } from "react-i18next";
import {
  ShieldCheckIcon,
  UserGroupIcon,
  LockClosedIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

const RoleCard = ({ role, onEdit, onDelete, isLoading }) => {
  const { t } = useTranslation();

  const getStatusBadge = () => {
    if (role.is_system) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          {t("admin.roles.systemRole", "System Role")}
        </span>
      );
    }

    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          role.is_active
            ? "bg-green-100 text-green-800"
            : "bg-gray-100 text-gray-800"
        }`}
      >
        {role.is_active ? t("common.active") : t("common.inactive")}
      </span>
    );
  };

  const getPermissionPreview = () => {
    const permissions = role.permissions || [];
    if (permissions.length === 0) {
      return (
        <div className="text-xs text-gray-500">
          {t("admin.roles.noPermissions", "No permissions assigned")}
        </div>
      );
    }

    const visiblePermissions = permissions.slice(0, 3);
    const remainingCount = permissions.length - 3;

    return (
      <div className="mt-3">
        <div className="text-xs text-gray-500 mb-2">
          {t("admin.roles.keyPermissions", "Key Permissions:")}
        </div>
        <div className="flex flex-wrap gap-1">
          {visiblePermissions.map((permission) => (
            <span
              key={permission}
              className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-50 text-blue-700"
            >
              {permission
                .replace(/_/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase())}
            </span>
          ))}
          {remainingCount > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
              +{remainingCount} {t("admin.roles.more", "more")}
            </span>
          )}
        </div>
      </div>
    );
  };

  const canDelete = !role.is_system && role.user_count === 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              role.is_system
                ? "bg-purple-100"
                : role.is_active
                ? "bg-indigo-100"
                : "bg-gray-100"
            }`}
          >
            <ShieldCheckIcon
              className={`h-5 w-5 ${
                role.is_system
                  ? "text-purple-600"
                  : role.is_active
                  ? "text-indigo-600"
                  : "text-gray-600"
              }`}
            />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 line-clamp-1">
              {role.name}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              {getStatusBadge()}
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {role.description && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {role.description}
        </p>
      )}

      {/* Statistics */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span className="flex items-center">
            <UserGroupIcon className="h-4 w-4 mr-1" />
            {role.user_count || 0} {t("admin.roles.users", "users")}
          </span>
          <span className="flex items-center">
            <LockClosedIcon className="h-4 w-4 mr-1" />
            {role.permissions?.length || 0}{" "}
            {t("admin.roles.permissions", "permissions")}
          </span>
        </div>
      </div>

      {/* Permissions Preview */}
      {getPermissionPreview()}

      {/* Actions */}
      <div className="mt-4 flex space-x-2">
        <button
          onClick={onEdit}
          disabled={isLoading}
          className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
        >
          <PencilIcon className="h-4 w-4 mr-1" />
          {t("common.edit")}
        </button>

        <button
          onClick={onDelete}
          disabled={!canDelete || isLoading}
          className={`inline-flex items-center px-3 py-2 text-sm border rounded-lg transition-colors ${
            canDelete
              ? "border-red-200 text-red-600 hover:bg-red-50"
              : "border-gray-200 text-gray-400 cursor-not-allowed"
          }`}
          title={
            !canDelete && role.user_count > 0
              ? t("admin.roles.cannotDeleteWithUsers", {
                  count: role.user_count,
                })
              : t("admin.roles.deleteRole", "Delete role")
          }
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Warning for roles with users */}
      {role.user_count > 0 && !role.is_system && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex">
            <ExclamationTriangleIcon className="h-4 w-4 text-yellow-400 mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-yellow-800">
              {t(
                "admin.roles.deleteWarning",
                "This role cannot be deleted as it has assigned users."
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleCard;
