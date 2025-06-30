// src/components/Admin/RolesManagement/RolesManagement.js
import React, { useState } from "react";
import { useQuery, useQueryClient } from "react-query";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { adminService } from "../../../services/adminService";

// Components
import RolesHeader from "./components/RolesHeader";
import RolesFilters from "./components/RolesFilters";
import RolesGrid from "./components/RolesGrid";
import RolesList from "./components/RolesList";
import RoleFormModal from "./components/RoleFormModal";
import RolesSummary from "./components/RolesSummary";
import LoadingSpinner from "../../Common/LoadingSpinner";
import EmptyState from "./components/EmptyState";

// Hooks
import { useRoleOperations } from "./hooks/useRoleOperations";
import { usePermissions } from "./hooks/usePermissions";
import { useViewMode } from "./hooks/useViewMode";

const RolesManagement = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // State management
  const [filters, setFilters] = useState({
    page: 1,
    search: "",
    status: "all",
    sortBy: "name",
    sortOrder: "asc",
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  // Custom hooks
  const { viewMode, setViewMode } = useViewMode();

  // Data fetching
  const {
    data: rolesData,
    isLoading: rolesLoading,
    error: rolesError,
  } = useQuery(["admin-roles", filters], () => adminService.getRoles(filters), {
    keepPreviousData: true,
    staleTime: 30000, // 30 seconds
  });

  // Custom hooks
  const { permissionsData, isLoading: permissionsLoading } = usePermissions();
  const { createRoleMutation, updateRoleMutation, deleteRoleMutation } =
    useRoleOperations({
      onSuccess: () => {
        queryClient.invalidateQueries(["admin-roles"]);
        handleCloseModal();
      },
    });

  // Event handlers
  const handleFiltersChange = (newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const handleCreateRole = () => {
    setEditingRole(null);
    setSelectedPermissions([]);
    setShowCreateModal(true);
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    setSelectedPermissions(role.permissions || []);
    setShowCreateModal(true);
  };

  const handleDeleteRole = (role) => {
    if (role.is_system) {
      toast.error(t("admin.roles.cannotDeleteSystemRole"));
      return;
    }

    if (role.user_count > 0) {
      toast.error(
        t("admin.roles.cannotDeleteRoleWithUsers", {
          name: role.name,
          count: role.user_count,
        })
      );
      return;
    }

    if (window.confirm(t("admin.roles.confirmDelete", { name: role.name }))) {
      deleteRoleMutation.mutate(role.id);
    }
  };

  const handleSubmitRole = (formData) => {
    const payload = {
      ...formData,
      permissions: selectedPermissions,
    };

    if (editingRole) {
      updateRoleMutation.mutate({ id: editingRole.id, data: payload });
    } else {
      createRoleMutation.mutate(payload);
    }
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingRole(null);
    setSelectedPermissions([]);
  };

  const handlePermissionToggle = (permission) => {
    setSelectedPermissions((prev) => {
      if (prev.includes(permission)) {
        return prev.filter((p) => p !== permission);
      } else {
        return [...prev, permission];
      }
    });
  };

  const handlePermissionGroupToggle = (groupPermissions) => {
    setSelectedPermissions((prev) => {
      const allSelected = groupPermissions.every((p) => prev.includes(p));
      if (allSelected) {
        return prev.filter((p) => !groupPermissions.includes(p));
      } else {
        return [...new Set([...prev, ...groupPermissions])];
      }
    });
  };

  const handleSelectAllPermissions = () => {
    setSelectedPermissions(permissionsData?.permissions || []);
  };

  const handleClearAllPermissions = () => {
    setSelectedPermissions([]);
  };

  // Loading states
  if (rolesLoading && !rolesData) {
    return <LoadingSpinner />;
  }

  if (rolesError) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{t("common.error")}</div>
        <div className="text-gray-500">{rolesError.message}</div>
      </div>
    );
  }

  const roles = rolesData?.roles || [];
  const hasResults = roles.length > 0;
  const isFiltered = filters.search || filters.status !== "all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <RolesHeader onCreateRole={handleCreateRole} />

      {/* Filters */}
      <RolesFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        resultsCount={rolesData?.summary?.total || 0}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Main Content */}
      {hasResults ? (
        <>
          {/* Roles Content - Grid or List */}
          {viewMode === "grid" ? (
            <RolesGrid
              roles={roles}
              onEditRole={handleEditRole}
              onDeleteRole={handleDeleteRole}
              isLoading={rolesLoading}
            />
          ) : (
            <RolesList
              roles={roles}
              onEditRole={handleEditRole}
              onDeleteRole={handleDeleteRole}
              isLoading={rolesLoading}
            />
          )}

          {/* Pagination */}
          {rolesData?.pagination?.pages > 1 && (
            <div className="flex justify-center">
              <nav className="flex space-x-2">
                {Array.from({ length: rolesData.pagination.pages }, (_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => handlePageChange(i + 1)}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      filters.page === i + 1
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </nav>
            </div>
          )}
        </>
      ) : (
        /* Empty State */
        <EmptyState
          isFiltered={isFiltered}
          onCreateRole={handleCreateRole}
          onClearFilters={() =>
            handleFiltersChange({ search: "", status: "all" })
          }
        />
      )}

      {/* Summary Statistics */}
      <RolesSummary
        summary={rolesData?.summary}
        permissionsCount={permissionsData?.permissions?.length || 0}
      />

      {/* Role Form Modal */}
      {showCreateModal && (
        <RoleFormModal
          role={editingRole}
          permissionsData={permissionsData}
          selectedPermissions={selectedPermissions}
          onSubmit={handleSubmitRole}
          onClose={handleCloseModal}
          onPermissionToggle={handlePermissionToggle}
          onPermissionGroupToggle={handlePermissionGroupToggle}
          onSelectAllPermissions={handleSelectAllPermissions}
          onClearAllPermissions={handleClearAllPermissions}
          isLoading={
            createRoleMutation.isLoading || updateRoleMutation.isLoading
          }
          isLoadingPermissions={permissionsLoading}
        />
      )}
    </div>
  );
};

export default RolesManagement;
