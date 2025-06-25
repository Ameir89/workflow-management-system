// src/components/Admin/UserManagement.js - Refactored Main Component
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { adminService } from "../../../services/adminService";
import { PlusIcon, UserIcon } from "@heroicons/react/24/outline";

// Import child components
import UserSearchFilters from "./UserSearchFilters";
import UserTable from "./UserTable";
import UserForm from "./UserForm";
import UserStats from "./UserStats";
import Pagination from "./Pagination";

const UserManagement = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // State management
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Data fetching
  const { data: usersData, isLoading } = useQuery(
    ["admin-users", page, search, filters],
    () => adminService.getUsers({ page, limit: 20, search, ...filters }),
    { keepPreviousData: true }
  );

  const { data: roles } = useQuery("admin-roles", () =>
    adminService.getRoles()
  );

  // Mutations
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

  // Event handlers
  const handleDeleteUser = (user) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${user.first_name} ${user.last_name}"?`
      )
    ) {
      deleteUserMutation.mutate(user.id);
    }
  };

  const handleCreateUser = (userData) => {
    createUserMutation.mutate(userData);
  };

  const handleUpdateUser = (userData) => {
    updateUserMutation.mutate({ id: editingUser.id, data: userData });
  };

  // Loading state
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
      <UserSearchFilters
        search={search}
        setSearch={setSearch}
        filters={filters}
        setFilters={setFilters}
        roles={roles}
        t={t}
      />

      {/* Users Table */}
      <UserTable
        users={usersData?.users || []}
        onEdit={setEditingUser}
        onDelete={handleDeleteUser}
        t={t}
      />

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

      {/* Pagination */}
      {usersData?.pagination && usersData.pagination.pages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={usersData.pagination.pages}
          totalItems={usersData.pagination.total}
          itemsPerPage={20}
          onPageChange={setPage}
        />
      )}

      {/* Summary Statistics */}
      <UserStats summary={usersData?.summary} />

      {/* Modals */}
      {showCreateModal && (
        <UserForm
          roles={roles}
          onSubmit={handleCreateUser}
          onCancel={() => setShowCreateModal(false)}
          isLoading={createUserMutation.isLoading}
          t={t}
        />
      )}

      {editingUser && (
        <UserForm
          user={editingUser}
          roles={roles}
          onSubmit={handleUpdateUser}
          onCancel={() => setEditingUser(null)}
          isLoading={updateUserMutation.isLoading}
          t={t}
        />
      )}
    </div>
  );
};

export default UserManagement;
