// src/components/Admin/RolesManagement/components/PermissionItem.js
import React from "react";
import { formatPermissionName } from "../utils/permissionsUtils";

const PermissionItem = ({ permission, isSelected, onToggle }) => {
  const formattedName = formatPermissionName(permission);

  return (
    <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggle}
        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded flex-shrink-0"
      />
      <span className="text-sm text-gray-700 flex-1 select-none">
        {formattedName}
      </span>
    </label>
  );
};

export default PermissionItem;
