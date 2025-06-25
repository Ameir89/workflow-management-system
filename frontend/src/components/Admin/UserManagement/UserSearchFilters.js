// src/components/Admin/UserManagement/UserSearchFilters.js
import React from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

const UserSearchFilters = ({
  search,
  setSearch,
  filters,
  setFilters,
  roles,
  t,
}) => {
  return (
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
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">{t("common.all")}</option>
            <option value="active">{t("admin.users.active")}</option>
            <option value="inactive">{t("admin.users.inactive")}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Verification
          </label>
          <select
            value={filters.verified || ""}
            onChange={(e) =>
              setFilters({ ...filters, verified: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">{t("common.all")}</option>
            <option value="true">Verified</option>
            <option value="false">Unverified</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default UserSearchFilters;
