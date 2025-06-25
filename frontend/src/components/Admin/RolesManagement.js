// src/components/Admin/RolesManagement.js
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { adminService } from "../../services/adminService";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  LockClosedIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

const RolesManagement = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  // Fetch roles
  const { data: rolesData, isLoading } = useQuery(
    ["admin-roles", page, search],
    () => adminService.getRoles({ page, limit: 20, search }),
    { keepPreviousData: true }
  );

  // Fetch all available permissions
  const { data: permissionsData } = useQuery(["admin-permissions"], () =>
    adminService.getPermissions()
  );

  // Create role mutation
  const createRoleMutation = useMutation(
    (roleData) => adminService.createRole(roleData),
    {
      onSuccess: () => {
        toast.success("Role created successfully");
        queryClient.invalidateQueries(["admin-roles"]);
        setShowCreateModal(false);
        resetForm();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );

  // Update role mutation
  const updateRoleMutation = useMutation(
    ({ id, data }) => adminService.updateRole(id, data),
    {
      onSuccess: () => {
        toast.success("Role updated successfully");
        queryClient.invalidateQueries(["admin-roles"]);
        setEditingRole(null);
        resetForm();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );

  // Delete role mutation
  const deleteRoleMutation = useMutation((id) => adminService.deleteRole(id), {
    onSuccess: () => {
      toast.success("Role deleted successfully");
      queryClient.invalidateQueries(["admin-roles"]);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setSelectedPermissions([]);
  };

  const handleDeleteRole = (role) => {
    if (role.is_system) {
      toast.error("Cannot delete system roles");
      return;
    }

    if (role.user_count > 0) {
      toast.error(
        `Cannot delete role "${role.name}" as it has ${role.user_count} assigned users`
      );
      return;
    }

    if (
      window.confirm(`Are you sure you want to delete the role "${role.name}"?`)
    ) {
      deleteRoleMutation.mutate(role.id);
    }
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    setSelectedPermissions(role.permissions || []);
    setShowCreateModal(true);
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

  const groupPermissions = (permissions) => {
    const groups = {
      workflow: {
        name: "Workflow Management",
        permissions: permissions?.workflow_management?.permissions || [],
      },
      task: {
        name: "Task Management",
        permissions: permissions?.task_management?.permissions || [],
      },
      form: {
        name: "Forms Management",
        permissions: permissions?.form_management?.permissions || [],
      },
      user: {
        name: "User Management",
        permissions: permissions?.user_management?.permissions || [],
      },
      admin: {
        name: "System Administration",
        permissions: permissions?.system_administration?.permissions || [],
      },
      webhook: {
        name: "Webhooks",
        permissions:
          permissions && permissions.length > 0
            ? permissions?.filter((p) => p.startsWith("webhook_")) || []
            : [],
      },
      admin: {
        name: "Administration",
        permissions:
          permissions && permissions.length > 0
            ? permissions?.filter(
                (p) =>
                  p.startsWith("admin_") ||
                  p.startsWith("view_audit") ||
                  p.startsWith("manage_system")
              ) || []
            : [],
      },
      webhook: {
        name: "Webhooks",
        permissions:
          permissions && permissions.length > 0
            ? permissions?.filter((p) => p.startsWith("webhook_")) || []
            : [],
        file: {
          name: "File Management",
          permissions:
            permissions && permissions.length > 0
              ? permissions?.filter((p) => p.startsWith("file_")) || []
              : [],
        },
        report: {
          name: "Reports & Analytics",
          permissions:
            permissions && permissions.length > 0
              ? permissions?.filter(
                  (p) => p.startsWith("report_") || p.startsWith("view_reports")
                ) || []
              : [],
        },
        system: {
          name: "System Permissions",
          permissions:
            permissions && permissions.length > 0
              ? permissions?.filter(
                  (p) =>
                    !p.startsWith("workflow_") &&
                    !p.startsWith("task_") &&
                    !p.startsWith("form_") &&
                    !p.startsWith("user_") &&
                    !p.startsWith("admin_") &&
                    !p.startsWith("webhook_") &&
                    !p.startsWith("file_") &&
                    !p.startsWith("report_") &&
                    !p.startsWith("manage_users") &&
                    !p.startsWith("view_audit") &&
                    !p.startsWith("manage_system") &&
                    !p.startsWith("view_reports")
                )
              : [],
        },
      },
    };

    return Object.entries(groups).filter(
      ([_, group]) => group.permissions.length > 0
    );
  };

  const RoleForm = ({ role, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
      name: role?.name || "",
      description: role?.description || "",
      is_active: role?.is_active !== false,
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      onSubmit({
        ...formData,
        permissions: selectedPermissions,
      });
    };

    console.log("permissionsData ", permissionsData.permissions);
    const permissionGroups = groupPermissions(permissionsData?.permissions);

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              {role ? "Edit Role" : "Create New Role"}
            </h3>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Workflow Manager"
                />
              </div>

              <div className="flex items-center mt-6">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Active Role
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Describe what this role is for..."
              />
            </div>

            {/* Permissions */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium text-gray-900">
                  Permissions ({selectedPermissions.length} selected)
                </h4>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedPermissions(permissionsData?.permissions || [])
                    }
                    className="text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPermissions([])}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                {permissionGroups.map(([groupKey, group]) => (
                  <div
                    key={groupKey}
                    className="border-b border-gray-200 last:border-b-0"
                  >
                    <div className="bg-gray-50 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-sm font-medium text-gray-900">
                          {group.name}
                        </h5>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              const groupPerms = group.permissions;
                              const allSelected = groupPerms.every((p) =>
                                selectedPermissions.includes(p)
                              );
                              if (allSelected) {
                                setSelectedPermissions((prev) =>
                                  prev.filter((p) => !groupPerms.includes(p))
                                );
                              } else {
                                setSelectedPermissions((prev) => [
                                  ...new Set([...prev, ...groupPerms]),
                                ]);
                              }
                            }}
                            className="text-xs text-indigo-600 hover:text-indigo-800"
                          >
                            {group.permissions.every((p) =>
                              selectedPermissions.includes(p)
                            )
                              ? "Deselect All"
                              : "Select All"}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {group.permissions.map((permission) => (
                        <label
                          key={permission}
                          className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPermissions.includes(permission)}
                            onChange={() => handlePermissionToggle(permission)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700 flex-1">
                            {permission
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  createRoleMutation.isLoading || updateRoleMutation.isLoading
                }
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                {createRoleMutation.isLoading ||
                updateRoleMutation.isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : role ? (
                  "Update Role"
                ) : (
                  "Create Role"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Roles & Permissions
          </h1>
          <p className="text-gray-600">
            Manage user roles and their permissions
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Create New Role
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search roles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rolesData?.roles?.map((role) => (
          <div
            key={role.id}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
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
                  <h3 className="text-lg font-medium text-gray-900">
                    {role.name}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        role.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {role.is_active ? "Active" : "Inactive"}
                    </span>
                    {role.is_system && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        System Role
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-600 mt-3">{role.description}</p>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span className="flex items-center">
                  <UserGroupIcon className="h-4 w-4 mr-1" />
                  {role.user_count || 0} users
                </span>
                <span className="flex items-center">
                  <LockClosedIcon className="h-4 w-4 mr-1" />
                  {role.permissions?.length || 0} permissions
                </span>
              </div>

              {role?.permissions && role?.permissions?.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs text-gray-500 mb-2">
                    Key Permissions:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {role?.permissions?.slice(0, 3).map((permission) => (
                      <span
                        key={permission}
                        className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-50 text-blue-700"
                      >
                        {permission
                          ? permission
                          : //     ?.replace(/_/g, " ")
                            //     ?.replace(/\b\w/g, (l) => l.toUpperCase())
                            null}
                      </span>
                    ))}
                    {role?.permissions?.length > 3 && (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
                        +{role.permissions.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex space-x-2">
              <button
                onClick={() => handleEditRole(role)}
                className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100"
              >
                <PencilIcon className="h-4 w-4 mr-1" />
                Edit
              </button>
              {!role.is_system && (
                <button
                  onClick={() => handleDeleteRole(role)}
                  disabled={role.user_count > 0}
                  className={`inline-flex items-center px-3 py-2 text-sm border rounded-lg ${
                    role.user_count > 0
                      ? "border-gray-200 text-gray-400 cursor-not-allowed"
                      : "border-red-200 text-red-600 hover:bg-red-50"
                  }`}
                  title={
                    role.user_count > 0
                      ? `Cannot delete role with ${role.user_count} assigned users`
                      : "Delete role"
                  }
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>

            {role.user_count > 0 && !role.is_system && (
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-4 w-4 text-yellow-400 mr-2 mt-0.5" />
                  <div className="text-xs text-yellow-800">
                    This role cannot be deleted as it has assigned users.
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {rolesData?.roles?.length === 0 && (
        <div className="text-center py-12">
          <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No roles found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {search
              ? "No roles match your search criteria."
              : "Get started by creating your first role."}
          </p>
          {!search && (
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Your First Role
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <RoleForm
          role={editingRole}
          onSubmit={(data) => {
            if (editingRole) {
              updateRoleMutation.mutate({ id: editingRole.id, data });
            } else {
              createRoleMutation.mutate(data);
            }
          }}
          onCancel={() => {
            setShowCreateModal(false);
            setEditingRole(null);
            resetForm();
          }}
        />
      )}

      {/* Summary Statistics */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {rolesData?.summary?.total || 0}
            </div>
            <div className="text-sm text-gray-500">Total Roles</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {rolesData?.summary?.active || 0}
            </div>
            <div className="text-sm text-gray-500">Active Roles</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {rolesData?.summary?.system || 0}
            </div>
            <div className="text-sm text-gray-500">System Roles</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {permissionsData?.permissions?.length || 0}
            </div>
            <div className="text-sm text-gray-500">Available Permissions</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RolesManagement;
