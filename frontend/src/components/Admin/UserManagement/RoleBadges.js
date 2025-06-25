// src/components/Admin/UserManagement/RoleBadges.js
import React from "react";

const RoleBadges = ({ roles, maxVisible = 3 }) => {
  if (!roles || roles.length === 0) {
    return <span className="text-sm text-gray-400">No roles assigned</span>;
  }

  const visibleRoles = roles.slice(0, maxVisible);
  const hiddenCount = roles.length - maxVisible;

  const getRoleColor = (roleName) => {
    const roleColors = {
      admin: "bg-red-100 text-red-800",
      manager: "bg-purple-100 text-purple-800",
      editor: "bg-blue-100 text-blue-800",
      viewer: "bg-green-100 text-green-800",
      moderator: "bg-yellow-100 text-yellow-800",
      analyst: "bg-cyan-100 text-cyan-800",
      developer: "bg-indigo-100 text-indigo-800",
      designer: "bg-pink-100 text-pink-800",
    };

    const roleLower = (
      typeof roleName === "string" ? roleName : roleName.name
    ).toLowerCase();
    return roleColors[roleLower] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="flex flex-wrap gap-1">
      {visibleRoles.map((role, index) => (
        <span
          key={typeof role === "string" ? role : role.id || index}
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRoleColor(
            role
          )}`}
        >
          {typeof role === "string" ? role : role.name}
        </span>
      ))}
      {hiddenCount > 0 && (
        <span
          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600"
          title={`+${hiddenCount} more roles`}
        >
          +{hiddenCount}
        </span>
      )}
    </div>
  );
};

export default RoleBadges;
