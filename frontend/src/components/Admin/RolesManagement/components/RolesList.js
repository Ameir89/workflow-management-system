// src/components/Admin/RolesManagement/components/RolesList.js
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

const RolesList = ({ roles, onEditRole, onDeleteRole, isLoading }) => {
  const { t } = useTranslation();

  const getStatusBadge = (role) => {
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

  const getPermissionPreview = (role) => {
    const permissions = role.permissions || [];
    if (permissions.length === 0) {
      return (
        <span className="text-sm text-gray-500">
          {t("admin.roles.noPermissions", "No permissions assigned")}
        </span>
      );
    }

    const visiblePermissions = permissions.slice(0, 2);
    const remainingCount = permissions.length - 2;

    return (
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
    );
  };

  const canDelete = (role) => !role.is_system && role.user_count === 0;

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("admin.roles.role", "Role")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("common.status", "Status")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("admin.roles.users", "Users")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("admin.roles.permissions", "Permissions")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("admin.roles.keyPermissions", "Key Permissions")}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("common.actions", "Actions")}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {roles.map((role) => (
              <tr key={role.id} className="hover:bg-gray-50 transition-colors">
                {/* Role Name & Description */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${
                        role.is_system
                          ? "bg-purple-100"
                          : role.is_active
                          ? "bg-indigo-100"
                          : "bg-gray-100"
                      }`}
                    >
                      <ShieldCheckIcon
                        className={`h-4 w-4 ${
                          role.is_system
                            ? "text-purple-600"
                            : role.is_active
                            ? "text-indigo-600"
                            : "text-gray-600"
                        }`}
                      />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {role.name}
                      </div>
                      {role.description && (
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {role.description}
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Status */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(role)}
                </td>

                {/* Users Count */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-500">
                    <UserGroupIcon className="h-4 w-4 mr-1" />
                    {role.user_count || 0}
                  </div>
                </td>

                {/* Permissions Count */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-500">
                    <LockClosedIcon className="h-4 w-4 mr-1" />
                    {role.permissions?.length || 0}
                  </div>
                </td>

                {/* Key Permissions */}
                <td className="px-6 py-4">
                  <div className="max-w-xs">{getPermissionPreview(role)}</div>
                </td>

                {/* Actions */}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex space-x-2 justify-end">
                    <button
                      onClick={() => onEditRole(role)}
                      disabled={isLoading}
                      className="inline-flex items-center px-3 py-1 text-sm bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 transition-colors disabled:opacity-50"
                      title={t("common.edit", "Edit")}
                    >
                      <PencilIcon className="h-4 w-4 mr-1" />
                      {t("common.edit")}
                    </button>

                    <button
                      onClick={() => onDeleteRole(role)}
                      disabled={!canDelete(role) || isLoading}
                      className={`inline-flex items-center px-3 py-1 text-sm border rounded-md transition-colors ${
                        canDelete(role)
                          ? "border-red-200 text-red-600 hover:bg-red-50"
                          : "border-gray-200 text-gray-400 cursor-not-allowed"
                      }`}
                      title={
                        !canDelete(role) && role.user_count > 0
                          ? t("admin.roles.cannotDeleteWithUsers", {
                              count: role.user_count,
                            })
                          : t("admin.roles.deleteRole", "Delete role")
                      }
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Warning Messages for Roles with Users */}
      {roles.some((role) => role.user_count > 0 && !role.is_system) && (
        <div className="bg-yellow-50 border-t border-yellow-200 px-6 py-3">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">
                {t(
                  "admin.roles.bulkDeleteWarning",
                  "Note about role deletion:"
                )}
              </p>
              <p>
                {t(
                  "admin.roles.rolesWithUsersWarning",
                  "Roles with assigned users cannot be deleted. Remove users from these roles first."
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesList;
