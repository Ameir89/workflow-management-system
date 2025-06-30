// src/components/Admin/RolesManagement/components/PermissionsSelector.js
import React from "react";
import { useTranslation } from "react-i18next";
import PermissionGroup from "./PermissionGroup";
import { groupPermissions } from "../utils/permissionsUtils";

const PermissionsSelector = ({
  permissionsData,
  selectedPermissions,
  onPermissionToggle,
  onPermissionGroupToggle,
  onSelectAll,
  onClearAll,
  error,
}) => {
  const { t } = useTranslation();

  const permissionGroups = groupPermissions(permissionsData?.permissions);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-md font-medium text-gray-900">
            {t("admin.roles.permissions", "Permissions")} (
            {selectedPermissions.length} {t("admin.roles.selected", "selected")}
            )
          </h4>
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={onSelectAll}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            {t("common.selectAll", "Select All")}
          </button>
          <span className="text-gray-300">|</span>
          <button
            type="button"
            onClick={onClearAll}
            className="text-sm text-red-600 hover:text-red-800 font-medium"
          >
            {t("common.clearAll", "Clear All")}
          </button>
        </div>
      </div>

      {/* Permissions Groups */}
      <div
        className={`max-h-96 overflow-y-auto border rounded-lg ${
          error ? "border-red-300" : "border-gray-200"
        }`}
      >
        {permissionGroups.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>
              {t(
                "admin.roles.noPermissionsAvailable",
                "No permissions available"
              )}
            </p>
          </div>
        ) : (
          permissionGroups.map(([groupKey, group]) => (
            <PermissionGroup
              key={groupKey}
              groupKey={groupKey}
              group={group}
              selectedPermissions={selectedPermissions}
              onPermissionToggle={onPermissionToggle}
              onGroupToggle={() => onPermissionGroupToggle(group.permissions)}
            />
          ))
        )}
      </div>

      {/* Permission Summary */}
      {selectedPermissions.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
          <div className="text-sm text-indigo-800">
            <strong>{selectedPermissions.length}</strong>{" "}
            {t("admin.roles.permissionsSelected", "permissions selected")}
          </div>
          <div className="mt-1 text-xs text-indigo-600">
            {t(
              "admin.roles.permissionsHelp",
              "Users with this role will have access to features covered by these permissions."
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionsSelector;
