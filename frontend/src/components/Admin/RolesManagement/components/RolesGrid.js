// src/components/Admin/RolesManagement/components/RolesGrid.js
import React from "react";
import RoleCard from "./RoleCard";

const RolesGrid = ({ roles, onEditRole, onDeleteRole, isLoading }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {roles.map((role) => (
        <RoleCard
          key={role.id}
          role={role}
          onEdit={() => onEditRole(role)}
          onDelete={() => onDeleteRole(role)}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
};

export default RolesGrid;
