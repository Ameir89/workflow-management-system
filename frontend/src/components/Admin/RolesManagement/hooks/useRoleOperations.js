// src/components/Admin/RolesManagement/hooks/useRoleOperations.js
import { useMutation } from "react-query";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { adminService } from "../../../../services/adminService";

export const useRoleOperations = ({ onSuccess, onError } = {}) => {
  const { t } = useTranslation();

  // Create role mutation
  const createRoleMutation = useMutation(
    (roleData) => adminService.createRole(roleData),
    {
      onSuccess: (data) => {
        toast.success(
          t("admin.roles.createSuccess", "Role created successfully")
        );
        onSuccess?.(data);
      },
      onError: (error) => {
        const message =
          error.message ||
          t("admin.roles.createError", "Failed to create role");
        toast.error(message);
        onError?.(error);
      },
    }
  );

  // Update role mutation
  const updateRoleMutation = useMutation(
    ({ id, data }) => adminService.updateRole(id, data),
    {
      onSuccess: (data) => {
        toast.success(
          t("admin.roles.updateSuccess", "Role updated successfully")
        );
        onSuccess?.(data);
      },
      onError: (error) => {
        const message =
          error.message ||
          t("admin.roles.updateError", "Failed to update role");
        toast.error(message);
        onError?.(error);
      },
    }
  );

  // Delete role mutation
  const deleteRoleMutation = useMutation((id) => adminService.deleteRole(id), {
    onSuccess: (data) => {
      toast.success(
        t("admin.roles.deleteSuccess", "Role deleted successfully")
      );
      onSuccess?.(data);
    },
    onError: (error) => {
      const message =
        error.message || t("admin.roles.deleteError", "Failed to delete role");
      toast.error(message);
      onError?.(error);
    },
  });

  // Bulk operations mutation
  const bulkOperationMutation = useMutation(
    ({ operation, roleIds, data }) => {
      switch (operation) {
        case "activate":
          return adminService.bulkUpdateRoles(roleIds, { is_active: true });
        case "deactivate":
          return adminService.bulkUpdateRoles(roleIds, { is_active: false });
        case "delete":
          return adminService.bulkDeleteRoles(roleIds);
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
    },
    {
      onSuccess: (data, variables) => {
        const { operation, roleIds } = variables;
        const count = roleIds.length;

        let message;
        switch (operation) {
          case "activate":
            message = t(
              "admin.roles.bulkActivateSuccess",
              "{{count}} roles activated",
              { count }
            );
            break;
          case "deactivate":
            message = t(
              "admin.roles.bulkDeactivateSuccess",
              "{{count}} roles deactivated",
              { count }
            );
            break;
          case "delete":
            message = t(
              "admin.roles.bulkDeleteSuccess",
              "{{count}} roles deleted",
              { count }
            );
            break;
          default:
            message = t(
              "admin.roles.bulkOperationSuccess",
              "Bulk operation completed"
            );
        }

        toast.success(message);
        onSuccess?.(data);
      },
      onError: (error, variables) => {
        const { operation } = variables;
        const message =
          error.message ||
          t(
            "admin.roles.bulkOperationError",
            "Failed to perform bulk {{operation}}",
            { operation }
          );
        toast.error(message);
        onError?.(error);
      },
    }
  );

  return {
    createRoleMutation,
    updateRoleMutation,
    deleteRoleMutation,
    bulkOperationMutation,

    // Convenience methods
    createRole: createRoleMutation.mutate,
    updateRole: updateRoleMutation.mutate,
    deleteRole: deleteRoleMutation.mutate,
    bulkOperation: bulkOperationMutation.mutate,

    // Loading states
    isCreating: createRoleMutation.isLoading,
    isUpdating: updateRoleMutation.isLoading,
    isDeleting: deleteRoleMutation.isLoading,
    isBulkOperating: bulkOperationMutation.isLoading,

    // Any operation loading
    isLoading:
      createRoleMutation.isLoading ||
      updateRoleMutation.isLoading ||
      deleteRoleMutation.isLoading ||
      bulkOperationMutation.isLoading,
  };
};
