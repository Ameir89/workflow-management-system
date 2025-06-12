import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { webhooksService } from "../../services/webhooksService";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

const WebhooksList = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const {
    data: webhooksData,
    isLoading,
    error,
  } = useQuery(
    ["webhooks", page],
    () => webhooksService.getWebhooks({ page, limit: 20 }),
    { keepPreviousData: true }
  );

  const deleteWebhookMutation = useMutation(
    (id) => webhooksService.deleteWebhook(id),
    {
      onSuccess: () => {
        toast.success(t("webhooks.deleteSuccess"));
        queryClient.invalidateQueries(["webhooks"]);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );

  const testWebhookMutation = useMutation(
    (id) => webhooksService.testWebhook(id),
    {
      onSuccess: (data) => {
        toast.success(t("webhooks.testSuccess"));
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );

  const handleDeleteWebhook = (id, name) => {
    if (window.confirm(t("webhooks.confirmDelete", { name }))) {
      deleteWebhookMutation.mutate(id);
    }
  };

  const handleTestWebhook = (id) => {
    testWebhookMutation.mutate(id);
  };

  const getStatusIcon = (webhook) => {
    if (!webhook.is_active) {
      return <XCircleIcon className="h-5 w-5 text-gray-400" />;
    }

    const successRate =
      webhook.successful_deliveries / (webhook.delivery_count || 1);
    if (successRate >= 0.9) {
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    } else if (successRate >= 0.5) {
      return <ClockIcon className="h-5 w-5 text-yellow-500" />;
    } else {
      return <XCircleIcon className="h-5 w-5 text-red-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t("webhooks.title")}
          </h1>
          <p className="text-gray-600">{t("webhooks.subtitle")}</p>
        </div>
        <Link
          to="/webhooks/create"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          {t("webhooks.createNew")}
        </Link>
      </div>

      {/* Webhooks List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {webhooksData?.webhooks?.map((webhook) => (
            <li key={webhook.id}>
              <div className="px-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(webhook)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-indigo-600 truncate">
                        {webhook.name}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {webhook.url}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-900">
                        {webhook.delivery_count || 0} {t("webhooks.deliveries")}
                      </p>
                      <p className="text-sm text-gray-500">
                        {Math.round(
                          (webhook.successful_deliveries /
                            (webhook.delivery_count || 1)) *
                            100
                        )}
                        % {t("webhooks.success")}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleTestWebhook(webhook.id)}
                        disabled={testWebhookMutation.isLoading}
                        className="text-green-400 hover:text-green-500"
                        title={t("webhooks.test")}
                      >
                        <PlayIcon className="h-5 w-5" />
                      </button>
                      <Link
                        to={`/webhooks/${webhook.id}/deliveries`}
                        className="text-gray-400 hover:text-gray-500"
                        title={t("webhooks.viewDeliveries")}
                      >
                        <EyeIcon className="h-5 w-5" />
                      </Link>
                      <Link
                        to={`/webhooks/${webhook.id}/edit`}
                        className="text-indigo-400 hover:text-indigo-500"
                        title={t("common.edit")}
                      >
                        <PencilIcon className="h-5 w-5" />
                      </Link>
                      <button
                        onClick={() =>
                          handleDeleteWebhook(webhook.id, webhook.name)
                        }
                        disabled={deleteWebhookMutation.isLoading}
                        className="text-red-400 hover:text-red-500"
                        title={t("common.delete")}
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="flex flex-wrap gap-1">
                    {webhook.events?.map((event) => (
                      <span
                        key={event}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {event}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {t("common.createdBy")} {webhook.created_by_name} •{" "}
                    {new Date(webhook.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Empty State */}
      {webhooksData?.webhooks?.length === 0 && (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {t("webhooks.noWebhooks")}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {t("webhooks.noWebhooksDescription")}
          </p>
          <div className="mt-6">
            <Link
              to="/webhooks/create"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              {t("webhooks.createFirst")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebhooksList;
