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
} from "@heroicons/react/24/outline";

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

  const UserForm = ({ user, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
      username: user?.username || "",
      email: user?.email || "",
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      phone: user?.phone || "",
      password: "",
      roles: user?.roles || [],
      is_active: user?.is_active !== false,
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      onSubmit(formData);
    };

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {user ? t("admin.users.editUser") : t("admin.users.createUser")}
          </h3>

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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("admin.users.roles")}
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {roles?.roles?.map((role) => (
                  <label key={role.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.roles.includes(role.name)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            roles: [...formData.roles, role.name],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            roles: formData.roles.filter(
                              (r) => r !== role.name
                            ),
                          });
                        }
                      }}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-900">
                      {role.name}
                    </span>
                  </label>
                ))}
              </div>
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
              <label className="ml-2 text-sm text-gray-900">
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
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                {user ? t("common.update") : t("common.create")}
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
            <input
              type="text"
              placeholder={t("admin.users.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
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
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <UserIcon className="h-6 w-6 text-gray-500" />
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
                        key={role}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {role}
                      </span>
                    ))}
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
                  <button
                    onClick={() => setEditingUser(user)}
                    className="text-indigo-600 hover:text-indigo-900 mr-3"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
    </div>
  );
};

export default UserManagement;
