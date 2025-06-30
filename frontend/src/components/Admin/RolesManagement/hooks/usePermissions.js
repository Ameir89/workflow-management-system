// src/components/Admin/RolesManagement/hooks/usePermissions.js
import { useQuery } from "react-query";
import { adminService } from "../../../../services/adminService";
import {
  getFormattedPermissionsResponse,
  mockPermissions,
} from "../../../../mocks/permissions";

export const usePermissions = () => {
  const { data, isLoading, error } = useQuery(
    ["admin-permissions"],
    async () => {
      try {
        // Try to fetch from API first
        const response = await adminService.getPermissions();
        return response;
      } catch (error) {
        console.warn(
          "Failed to fetch permissions from API, using mock data:",
          error
        );
        // Fallback to mock data if API fails
        return getFormattedPermissionsResponse();
      }
    },
    {
      staleTime: 10 * 60 * 1000, // 10 minutes - permissions don't change often
      cacheTime: 30 * 60 * 1000, // 30 minutes
      retry: 1, // Only retry once before falling back to mock data
    }
  );

  return {
    permissionsData: data,
    isLoading,
    error,
    permissions: data?.permissions || mockPermissions,
    permissionsByCategory: data?.permissions || {},
  };
};
