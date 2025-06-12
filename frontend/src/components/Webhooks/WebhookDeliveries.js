import React, { useState } from "react";
import { useQuery } from "react-query";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { webhooksService } from "../../services/webhooksService";
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";

const WebhookDeliveries = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [page, setPage] = useState(1);
  const [selectedDelivery, setSelectedDelivery] = useState(null);

  const { data: deliveriesData, isLoading } = useQuery(
    ["webhook-deliveries", id, page],
    () => webhooksService.getWebhookDeliveries(id, { page, limit: 50 }),
    { keepPreviousData: true }
  );

  const { data: webhook } = useQuery(["webhook", id], () =>
    webhooksService.getWebhook(id)
  );

  const getStatusIcon = (delivery) => {
    if (delivery.delivered_at) {
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    } else if (delivery.delivery_attempts >= 3) {
      return <XCircleIcon className="h-5 w-5 text-red-500" />;
    } else {
      return <ClockIcon className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusText = (delivery) => {
    if (delivery.delivered_at) {
      return t("webhooks.delivered");
    } else if (delivery.delivery_attempts >= 3) {
      return t("webhooks.failed");
    } else {
      return t("webhooks.pending");
    }
  };

  const getStatusColor = (delivery) => {
    if (delivery.delivered_at) {
      return "text-green-800 bg-green-100";
    } else if (delivery.delivery_attempts >= 3) {
      return "text-red-800 bg-red-100";
    } else {
      return "text-yellow-800 bg-yellow-100";
    }
  };

  const DeliveryDetailModal = ({ delivery, onClose }) => {
    if (!delivery) return null;

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              {t("webhooks.deliveryDetail")}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* Delivery Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">
                {t("webhooks.deliveryInfo")}
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">
                    {t("webhooks.eventType")}:
                  </span>
                  <span className="ml-2">{delivery.event_type}</span>
                </div>
                <div>
                  <span className="font-medium">{t("webhooks.attempts")}:</span>
                  <span className="ml-2">{delivery.delivery_attempts}</span>
                </div>
                <div>
                  <span className="font-medium">{t("common.status")}:</span>
                  <span
                    className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                      delivery
                    )}`}
                  >
                    {getStatusText(delivery)}
                  </span>
                </div>
                <div>
                  <span className="font-medium">
                    {t("webhooks.responseStatus")}:
                  </span>
                  <span className="ml-2">
                    {delivery.response_status || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="font-medium">
                    {t("webhooks.lastAttempt")}:
                  </span>
                  <span className="ml-2">
                    {delivery.last_attempt_at
                      ? new Date(delivery.last_attempt_at).toLocaleString()
                      : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="font-medium">
                    {t("webhooks.delivered")}:
                  </span>
                  <span className="ml-2">
                    {delivery.delivered_at
                      ? new Date(delivery.delivered_at).toLocaleString()
                      : "No"}
                  </span>
                </div>
              </div>
            </div>

            {/* Payload */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">
                {t("webhooks.payload")}
              </h4>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto text-sm max-h-64">
                {JSON.stringify(delivery.payload, null, 2)}
              </pre>
            </div>

            {/* Response */}
            {delivery.response_body && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  {t("webhooks.response")}
                </h4>
                <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm max-h-64">
                  {delivery.response_body}
                </pre>
              </div>
            )}
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              {t("common.close")}
            </button>
          </div>
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t("webhooks.deliveries")} - {webhook?.name}
        </h1>
        <p className="text-gray-600">{t("webhooks.deliveriesSubtitle")}</p>
      </div>

      {/* Deliveries Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("webhooks.eventType")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("common.status")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("webhooks.attempts")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("webhooks.responseStatus")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("webhooks.lastAttempt")}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t("common.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {deliveriesData?.deliveries?.map((delivery) => (
              <tr key={delivery.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {delivery.event_type}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(delivery.created_at).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {getStatusIcon(delivery)}
                    <span
                      className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                        delivery
                      )}`}
                    >
                      {getStatusText(delivery)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {delivery.delivery_attempts}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {delivery.response_status || "N/A"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {delivery.last_attempt_at
                    ? new Date(delivery.last_attempt_at).toLocaleString()
                    : "N/A"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => setSelectedDelivery(delivery)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {deliveriesData?.deliveries?.length === 0 && (
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
            {t("webhooks.noDeliveries")}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {t("webhooks.noDeliveriesDescription")}
          </p>
        </div>
      )}

      {/* Delivery Detail Modal */}
      <DeliveryDetailModal
        delivery={selectedDelivery}
        onClose={() => setSelectedDelivery(null)}
      />
    </div>
  );
};

export default WebhookDeliveries;
