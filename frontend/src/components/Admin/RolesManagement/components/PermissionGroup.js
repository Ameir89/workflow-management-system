// src/components/Admin/RolesManagement/components/PermissionGroup.js
import React from "react";
import { useTranslation } from "react-i18next";
import PermissionItem from "./PermissionItem";

const PermissionGroup = ({
  groupKey,
  group,
  selectedPermissions,
  onPermissionToggle,
  onGroupToggle,
}) => {
  const { t } = useTranslation();

  const allSelected = group.permissions.every((permission) =>
    selectedPermissions.includes(permission)
  );
  const someSelected = group.permissions.some((permission) =>
    selectedPermissions.includes(permission)
  );

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      {/* Group Header */}
      <div className="bg-gray-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <h5 className="text-sm font-medium text-gray-900 flex items-center">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(input) => {
                if (input) input.indeterminate = someSelected && !allSelected;
              }}
              onChange={onGroupToggle}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-3"
            />
            {group.name}
            <span className="ml-2 text-xs text-gray-500">
              ({group.permissions.length}{" "}
              {t("admin.roles.permissions", "permissions")})
            </span>
          </h5>
          <div className="flex space-x-2">
            <span className="text-xs text-gray-500">
              {
                selectedPermissions.filter((p) => group.permissions.includes(p))
                  .length
              }{" "}
              / {group.permissions.length}
            </span>
            <button
              type="button"
              onClick={onGroupToggle}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              {allSelected
                ? t("admin.roles.deselectAll", "Deselect All")
                : t("admin.roles.selectAll", "Select All")}
            </button>
          </div>
        </div>
      </div>

      {/* Group Permissions */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {group.permissions.map((permission) => (
          <PermissionItem
            key={permission}
            permission={permission}
            isSelected={selectedPermissions.includes(permission)}
            onToggle={() => onPermissionToggle(permission)}
          />
        ))}
      </div>
    </div>
  );
};

export default PermissionGroup;
