// src/components/Admin/NotificationManagement/components/Templates/TemplatesList.js
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "react-query";
import { toast } from "react-toastify";
import {
  DocumentTextIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";

import { notificationManagementService } from "../../../../../services/notificationManagementService";
import LoadingSpinner from "../../../../Common/LoadingSpinner";
import EmptyState from "../../../../Common/EmptyState";
import SearchInput from "../../../../Common/SearchInput";
import StatusBadge from "../../../../Common/StatusBadge";
import ConfirmDialog from "../../../../Common/ConfirmDialog";
import BulkActionBar from "../common/BulkActionBar";
import { getChannelIcon, formatDate } from "../../utils/templateUtils";

const TemplatesList = ({
  data,
  isLoading,
  search,
  setSearch,
  filters,
  setFilters,
  resetFilters,
  selectedItems,
  setSelectedItems,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    template: null,
  });

  // Delete mutation
  const deleteMutation = useMutation(
    (id) => notificationManagementService.deleteTemplate(id),
    {
      onSuccess: () => {
        toast.success(t("notifications.templateDeleted"));
        queryClient.invalidateQueries(["notification-templates"]);
        setDeleteDialog({ open: false, template: null });
      },
      onError: (error) => {
        toast.error(error.message || t("notifications.errorDeletingTemplate"));
      },
    }
  );

  // Test template mutation
  const testMutation = useMutation(
    ({ id, testData }) =>
      notificationManagementService.testTemplate(id, testData),
    {
      onSuccess: () => {
        toast.success(t("notifications.testSent"));
      },
      onError: (error) => {
        toast.error(error.message || t("notifications.errorSendingTest"));
      },
    }
  );

  const handleDelete = (template) => {
    setDeleteDialog({ open: true, template });
  };

  const confirmDelete = () => {
    if (deleteDialog.template) {
      deleteMutation.mutate(deleteDialog.template.id);
    }
  };

  const handleTest = (template) => {
    const testData = {
      recipient: "test@example.com",
      variables: {},
    };
    testMutation.mutate({ id: template.id, testData });
  };

  const handleSelectItem = (templateId) => {
    setSelectedItems((prev) =>
      prev.includes(templateId)
        ? prev.filter((id) => id !== templateId)
        : [...prev, templateId]
    );
  };

  const handleSelectAll = () => {
    const allIds = templates.map((t) => t.id);
    setSelectedItems(selectedItems.length === allIds.length ? [] : allIds);
  };

  if (isLoading) {
    return <LoadingSpinner message={t("common.loading")} />;
  }

  const templates = data?.templates || [];

  const channelOptions = [
    { value: "", label: t("notifications.allChannels") },
    { value: "email", label: t("notifications.channelEmail") },
    { value: "sms", label: t("notifications.channelSMS") },
    { value: "in_app", label: t("notifications.channelInApp") },
  ];

  const statusOptions = [
    { value: "", label: t("notifications.allStatus") },
    { value: "active", label: t("notifications.active") },
    { value: "inactive", label: t("notifications.inactive") },
    { value: "draft", label: t("notifications.draft") },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Search and Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            onClear={() => setSearch("")}
            placeholder={t("notifications.searchTemplates")}
            className="max-w-md"
          />
        </div>

        <div className="flex items-center space-x-4">
          <select
            value={filters.channel || ""}
            onChange={(e) =>
              setFilters({ ...filters, channel: e.target.value })
            }
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {channelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={filters.status || ""}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            onClick={resetFilters}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            {t("common.clearFilters")}
          </button>

          <button
            onClick={() => navigate("/admin/notifications/templates/new")}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            {t("notifications.createTemplate")}
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      <BulkActionBar
        selectedItems={selectedItems}
        onClearSelection={() => setSelectedItems([])}
      />

      {/* Templates List */}
      {templates.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={
                        selectedItems.length === templates.length &&
                        templates.length > 0
                      }
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("notifications.template")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("notifications.channel")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("notifications.status")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("notifications.lastModified")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("notifications.usage")}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {templates.map((template) => (
                  <tr key={template.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(template.id)}
                        onChange={() => handleSelectItem(template.id)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {template.name}
                          </div>
                          {template.description && (
                            <div className="text-sm text-gray-500">
                              {template.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {getChannelIcon(template.channel)}
                        <span className="ml-2 text-sm text-gray-900 capitalize">
                          {template.channel}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge
                        status={
                          template.is_active
                            ? t("common.active")
                            : t("common.inactive")
                        }
                        variant={template.is_active ? "success" : "default"}
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(template.updated_at)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {t("notifications.times", {
                        count: template.usage_count || 0,
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() =>
                            navigate(
                              `/admin/notifications/templates/${template.id}`
                            )
                          }
                          className="text-gray-400 hover:text-gray-600 p-1"
                          title={t("common.view")}
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() =>
                            navigate(
                              `/admin/notifications/templates/${template.id}/edit`
                            )
                          }
                          className="text-indigo-600 hover:text-indigo-900 p-1"
                          title={t("common.edit")}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleTest(template)}
                          disabled={testMutation.isLoading}
                          className="text-green-600 hover:text-green-900 p-1"
                          title={t("notifications.sendTest")}
                        >
                          <PlayIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(template)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title={t("common.delete")}
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
        </div>
      ) : (
        <EmptyState
          icon={DocumentTextIcon}
          title={t("notifications.noTemplates")}
          description={t("notifications.noTemplatesDesc")}
          action={{
            label: t("notifications.createFirstTemplate"),
            onClick: () => navigate("/admin/notifications/templates/new"),
            icon: PlusIcon,
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, template: null })}
        onConfirm={confirmDelete}
        title={t("notifications.deleteTemplate")}
        message={t("notifications.deleteTemplateConfirm", {
          name: deleteDialog.template?.name,
        })}
        confirmLabel={t("common.delete")}
        variant="danger"
        isLoading={deleteMutation.isLoading}
      />
    </div>
  );
};

export default TemplatesList;
