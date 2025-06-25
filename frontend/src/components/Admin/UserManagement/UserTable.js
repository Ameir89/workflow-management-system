// src/components/Admin/UserManagement/UserTable.js
import React from "react";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import StatusBadge from "./StatusBadge";
import UserAvatar from "./UserAvatar";
import RoleBadges from "./RoleBadges";

const UserTable = ({ users, onEdit, onDelete, t }) => {
  return (
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
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <UserAvatar
                    firstName={user.first_name}
                    lastName={user.last_name}
                  />
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
                <RoleBadges roles={user.roles} />
              </td>

              <td className="px-6 py-4 whitespace-nowrap">
                <StatusBadge
                  isActive={user.is_active}
                  isVerified={user.is_verified}
                  twoFaEnabled={user.two_fa_enabled}
                  t={t}
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
                    onClick={() => onEdit(user)}
                    className="text-indigo-600 hover:text-indigo-900 p-1 rounded-md hover:bg-indigo-50"
                    title="Edit user"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(user)}
                    className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50"
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
  );
};

export default UserTable;
