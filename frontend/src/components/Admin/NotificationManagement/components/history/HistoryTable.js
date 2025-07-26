// src/components/Admin/NotificationManagement/components/History/HistoryTable.js
import React from "react";
import { useTranslation } from "react-i18next";
import DeliveryStatus from "./DeliveryStatus.js";
import { getChannelIcon } from "../../utils/templateUtils";

const HistoryTable = ({ notifications }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <ul className="divide-y divide-gray-200">
        {notifications.map((notification) => (
          <li key={notification.id} className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <DeliveryStatus status={notification.status} />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {notification.subject || notification.title}
                  </p>
                  <p className="text-sm text-gray-500">
                    {t("notifications.to")}: {notification.recipient}
                  </p>
                  <p className="text-sm text-gray-500">
                    {t("notifications.template")}: {notification.template_name}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">
                  <DeliveryStatus status={notification.status} showText />
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(notification.sent_at).toLocaleString()}
                </p>
                <div className="flex items-center space-x-1 mt-1">
                  {getChannelIcon(notification.channel)}
                  <span className="text-xs text-gray-500 capitalize">
                    {notification.channel}
                  </span>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HistoryTable;
