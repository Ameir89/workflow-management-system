// src/components/Admin/UserManagement/UserForm.js
import React, { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import MultiSelect from "./RolesMultiSelect";

const UserForm = ({ user, roles, onSubmit, onCancel, isLoading, t }) => {
  const [formData, setFormData] = useState({
    username: user?.username || "",
    email: user?.email || "",
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    phone: user?.phone || "",
    password: "",
    roles:
      user?.roles
        ?.map((role) => {
          // Handle both string role names and role objects
          if (typeof role === "string") {
            const roleObj = roles?.roles?.find((r) => r.name === role);
            return roleObj?.name;
          }
          return role.name;
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
      roles?.roles?.filter((role) => formData.roles.includes(role.name)) || [];
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
              value={formData.roles}
              onChange={(selectedRoles) =>
                setFormData({ ...formData, roles: selectedRoles })
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
              disabled={isLoading}
              className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {isLoading ? (
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

export default UserForm;
