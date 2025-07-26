// src/components/Admin/NotificationManagement/components/common/BulkActionBar.js
import React from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "react-query";
import { toast } from "react-toastify";
import { PlayIcon, PauseIcon, TrashIcon } from "@heroicons/react/24/outline";

import { notificationManagementService } from "../../../../../services/notificationManagementService";

const BulkActionBar = ({ selectedItems, onClearSelection }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Bulk operations mutation
  const bulkOperationMutation = useMutation(
    ({ operation, ids }) =>
      notificationManagementService.bulkOperations(operation, ids),
    {
      onSuccess: (data, { operation }) => {
        toast.success(
          t(
            `notifications.bulk${
              operation.charAt(0).toUpperCase() + operation.slice(1)
            }Success`,
            { count: selectedItems.length }
          )
        );
        queryClient.invalidateQueries(["notification-templates"]);
        onClearSelection();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );

  const handleBulkOperation = (operation) => {
    if (selectedItems.length === 0) {
      toast.warning(t("notifications.selectItemsFirst"));
      return;
    }

    const operationText = {
      activate: t("notifications.bulkActivate"),
      deactivate: t("notifications.bulkDeactivate"),
      delete: t("notifications.bulkDelete"),
    };

    if (
      window.confirm(
        t("notifications.bulkOperationConfirm", {
          operation: operationText[operation],
          count: selectedItems.length,
        })
      )
    ) {
      bulkOperationMutation.mutate({ operation, ids: selectedItems });
    }
  };

  if (selectedItems.length === 0) {
    return null;
  }

  return (
    <div className="flex space-x-2">
      <button
        onClick={() => handleBulkOperation("activate")}
        className="btn btn-outline btn-sm"
        disabled={bulkOperationMutation.isLoading}
      >
        <PlayIcon className="h-4 w-4 mr-2" />
        {t("notifications.bulkActivate")} ({selectedItems.length})
      </button>
      <button
        onClick={() => handleBulkOperation("deactivate")}
        className="btn btn-outline btn-sm"
        disabled={bulkOperationMutation.isLoading}
      >
        <PauseIcon className="h-4 w-4 mr-2" />
        {t("notifications.bulkDeactivate")} ({selectedItems.length})
      </button>
      <button
        onClick={() => handleBulkOperation("delete")}
        className="btn btn-danger btn-sm"
        disabled={bulkOperationMutation.isLoading}
      >
        <TrashIcon className="h-4 w-4 mr-2" />
        {t("notifications.bulkDelete")} ({selectedItems.length})
      </button>
    </div>
  );
};

export default BulkActionBar;
