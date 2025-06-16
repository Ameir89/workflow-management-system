// src/components/Admin/UserManagement.js - Updated with Multi-Role Support
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { adminService } from "../../services/adminService";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

// Multi-Select Component for Roles
const MultiSelect = ({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions =
    options?.filter((option) =>
      option.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  const selectedRoles =
    options?.filter((option) => value.includes(option.id)) || [];

  const handleToggleRole = (roleId) => {
    if (value.includes(roleId)) {
      onChange(value.filter((id) => id !== roleId));
    } else {
      onChange([...value, roleId]);
    }
  };

  const handleRemoveRole = (roleId) => {
    onChange(value.filter((id) => id !== roleId));
  };

  return (
    <div className="relative">
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[42px] flex items-center justify-between ${
          disabled
            ? "bg-gray-50 cursor-not-allowed"
            : "cursor-pointer hover:border-gray-400"
        }`}
      >
        <div className="flex flex-wrap gap-1 flex-1">
          {selectedRoles.length === 0 ? (
            <span className="text-gray-500">{placeholder}</span>
          ) : (
            selectedRoles.map((role) => (
              <span
                key={role.id}
                className="inline-flex items-center px-2 py-1 rounded bg-indigo-100 text-indigo-800 text-sm"
              >
                {role.name}
                {!disabled && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveRole(role.id);
                    }}
                    className="ml-1 text-indigo-600 hover:text-indigo-800"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))
          )}
        </div>
        {!disabled && (
          <ChevronDownIcon
            className={`h-4 w-4 text-gray-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        )}
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search roles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                No roles found
              </div>
            ) : (
              filteredOptions.map((role) => (
                <div
                  key={role.id}
                  onClick={() => handleToggleRole(role.id)}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 flex items-center justify-between ${
                    value.includes(role.id)
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-700"
                  }`}
                >
                  <div className="flex items-center">
                    <span>{role.name}</span>
                    {role.description && (
                      <span className="ml-2 text-xs text-gray-500 truncate">
                        - {role.description}
                      </span>
                    )}
                  </div>
                  {value.includes(role.id) && (
                    <CheckCircleIcon className="h-4 w-4 text-indigo-600" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-0" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
};

const UserManagement = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const { data: usersData, isLoading } = useQuery(
    ["admin-users", page, search, filters],
    () => adminService.getUsers({ page, limit: 20, search, ...filters }),
    { keepPreviousData: true }
  );

  const { data: roles } = useQuery("admin-roles", () =>
    adminService.getRoles()
  );

  const createUserMutation = useMutation(
    (userData) => adminService.createUser(userData),
    {
      onSuccess: () => {
        toast.success(t("admin.users.createSuccess"));
        queryClient.invalidateQueries(["admin-users"]);
        setShowCreateModal(false);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );

  const updateUserMutation = useMutation(
    ({ id, data }) => adminService.updateUser(id, data),
    {
      onSuccess: () => {
        toast.success(t("admin.users.updateSuccess"));
        queryClient.invalidateQueries(["admin-users"]);
        setEditingUser(null);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );

  const deleteUserMutation = useMutation((id) => adminService.deleteUser(id), {
    onSuccess: () => {
      toast.success("User deleted successfully");
      queryClient.invalidateQueries(["admin-users"]);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const UserForm = ({ user, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
      username: user?.username || "",
      email: user?.email || "",
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      phone: user?.phone || "",
      password: "",
      role_ids:
        user?.roles
          ?.map((role) => {
            // Handle both string role names and role objects
            if (typeof role === "string") {
              const roleObj = roles?.roles?.find((r) => r.name === role);
              return roleObj?.id;
            }
            return role.id;
          })
          .filter(Boolean) || [],
      is_active: user?.is_active !== false,
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      onSubmit(formData);
    };

    const getRoleDisplayText = () => {
      const selectedRoles =
        roles?.roles?.filter((role) => formData.role_ids.includes(role.id)) ||
        [];
      return (
        selectedRoles.map((role) => role.name).join(", ") || "No roles selected"
      );
    };

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              {user ? t("admin.users.editUser") : t("admin.users.createUser")}
            </h3>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("admin.users.firstName")} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={(e) =>
                    setFormData({ ...formData, first_name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("admin.users.lastName")} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={(e) =>
                    setFormData({ ...formData, last_name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("admin.users.username")} *
              </label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("admin.users.email")} *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("admin.users.phone")}
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {!user && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("admin.users.password")} *
                </label>
                <input
                  type="password"
                  required={!user}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("admin.users.roles")} *
              </label>
              <MultiSelect
                options={roles?.roles || []}
                value={formData.role_ids}
                onChange={(selectedRoleIds) =>
                  setFormData({ ...formData, role_ids: selectedRoleIds })
                }
                placeholder="Select roles for this user..."
              />
              <p className="mt-1 text-xs text-gray-500">
                Selected: {getRoleDisplayText()}
              </p>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData({ ...formData, is_active: e.target.checked })
                }
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-900">
                {t("admin.users.active")}
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={
                  createUserMutation.isLoading || updateUserMutation.isLoading
                }
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                {createUserMutation.isLoading ||
                updateUserMutation.isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : user ? (
                  t("common.update")
                ) : (
                  t("common.create")
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const StatusBadge = ({ isActive, isVerified, twoFaEnabled }) => (
    <div className="flex items-center space-x-1">
      {isActive ? (
        <CheckCircleIcon
          className="h-4 w-4 text-green-500"
          title={t("admin.users.active")}
        />
      ) : (
        <XCircleIcon
          className="h-4 w-4 text-red-500"
          title={t("admin.users.inactive")}
        />
      )}
      {isVerified && (
        <ShieldCheckIcon
          className="h-4 w-4 text-blue-500"
          title={t("admin.users.verified")}
        />
      )}
      {twoFaEnabled && (
        <span
          className="text-xs bg-green-100 text-green-800 px-1 rounded"
          title={t("admin.users.twoFaEnabled")}
        >
          2FA
        </span>
      )}
    </div>
  );

  const handleDeleteUser = (user) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${user.first_name} ${user.last_name}"?`
      )
    ) {
      deleteUserMutation.mutate(user.id);
    }
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
            {t("admin.users.title")}
          </h1>
          <p className="text-gray-600">{t("admin.users.subtitle")}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          {t("admin.users.createNew")}
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("common.search")}
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t("admin.users.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("admin.users.role")}
            </label>
            <select
              value={filters.role || ""}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{t("common.all")}</option>
              {roles?.roles?.map((role) => (
                <option key={role.id} value={role.name}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("common.status")}
            </label>
            <select
              value={filters.status || ""}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{t("common.all")}</option>
              <option value="active">{t("admin.users.active")}</option>
              <option value="inactive">{t("admin.users.inactive")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("admin.users.user")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("admin.users.contact")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("admin.users.roles")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("common.status")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("admin.users.lastLogin")}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("common.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {usersData?.users?.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                        <span className="text-sm font-medium text-white">
                          {user.first_name?.charAt(0)?.toUpperCase()}
                          {user.last_name?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        @{user.username}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{user.email}</div>
                  <div className="text-sm text-gray-500">{user.phone}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {user.roles?.map((role) => (
                      <span
                        key={typeof role === "string" ? role : role.id}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {typeof role === "string" ? role : role.name}
                      </span>
                    )) || (
                      <span className="text-sm text-gray-400">
                        No roles assigned
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge
                    isActive={user.is_active}
                    isVerified={user.is_verified}
                    twoFaEnabled={user.two_fa_enabled}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.last_login
                    ? new Date(user.last_login).toLocaleDateString()
                    : t("common.never")}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => setEditingUser(user)}
                      className="text-indigo-600 hover:text-indigo-900"
                      title="Edit user"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete user"
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

      {/* Empty State */}
      {usersData?.users?.length === 0 && (
        <div className="text-center py-12">
          <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No users found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {search || filters.role || filters.status
              ? "No users match your current filters."
              : "Get started by creating your first user."}
          </p>
          {!(search || filters.role || filters.status) && (
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Your First User
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <UserForm
          onSubmit={(data) => createUserMutation.mutate(data)}
          onCancel={() => setShowCreateModal(false)}
        />
      )}

      {editingUser && (
        <UserForm
          user={editingUser}
          onSubmit={(data) =>
            updateUserMutation.mutate({ id: editingUser.id, data })
          }
          onCancel={() => setEditingUser(null)}
        />
      )}

      {/* Pagination */}
      {usersData?.pagination && usersData.pagination.pages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setPage(Math.min(usersData.pagination.pages, page + 1))
              }
              disabled={page === usersData.pagination.pages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing {(page - 1) * 20 + 1} to{" "}
                {Math.min(page * 20, usersData.pagination.total)} of{" "}
                {usersData.pagination.total} results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setPage(Math.min(usersData.pagination.pages, page + 1))
                  }
                  disabled={page === usersData.pagination.pages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {usersData?.summary?.total || 0}
            </div>
            <div className="text-sm text-gray-500">Total Users</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {usersData?.summary?.active || 0}
            </div>
            <div className="text-sm text-gray-500">Active Users</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {usersData?.summary?.verified || 0}
            </div>
            <div className="text-sm text-gray-500">Verified</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {usersData?.summary?.with_2fa || 0}
            </div>
            <div className="text-sm text-gray-500">With 2FA</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
