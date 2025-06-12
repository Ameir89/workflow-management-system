import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { notificationsService } from "../../services/notificationsService";
import {
  BellIcon,
  CheckIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const NotificationCenter = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");

  const { data: notifications, isLoading } = useQuery(
    ["notifications", filter],
    () =>
      notificationsService.getNotifications({
        unread_only: filter === "unread",
        limit: 50,
      }),
    { refetchInterval: 30000 }
  );

  const { data: notificationStats } = useQuery(
    "notification-stats",
    () => notificationsService.getNotificationStats(),
    { refetchInterval: 30000 }
  );

  const markReadMutation = useMutation(
    (id) => notificationsService.markNotificationRead(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["notifications"]);
        queryClient.invalidateQueries(["notification-stats"]);
      },
    }
  );

  const markAllReadMutation = useMutation(
    () => notificationsService.markAllNotificationsRead(),
    {
      onSuccess: () => {
        toast.success(t("notifications.allMarkedRead"));
        queryClient.invalidateQueries(["notifications"]);
        queryClient.invalidateQueries(["notification-stats"]);
      },
    }
  );

  const deleteNotificationMutation = useMutation(
    (id) => notificationsService.deleteNotification(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["notifications"]);
        queryClient.invalidateQueries(["notification-stats"]);
      },
    }
  );

  const getNotificationIcon = (type) => {
    switch (type) {
      case "task_assigned":
      case "task_completed":
        return <CheckCircleIcon className="h-5 w-5 text-blue-500" />;
      case "sla_breach":
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case "workflow_completed":
        return <CheckIcon className="h-5 w-5 text-green-500" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatRelativeTime = (date) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInMinutes = Math.floor((now - notificationDate) / (1000 * 60));

    if (diffInMinutes < 1) return t("notifications.justNow");
    if (diffInMinutes < 60)
      return t("notifications.minutesAgo", { count: diffInMinutes });
    if (diffInMinutes < 1440)
      return t("notifications.hoursAgo", {
        count: Math.floor(diffInMinutes / 60),
      });
    return t("notifications.daysAgo", {
      count: Math.floor(diffInMinutes / 1440),
    });
  };

  const handleMarkAsRead = (notification) => {
    if (!notification.is_read) {
      markReadMutation.mutate(notification.id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />
        <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
          <div className="w-screen max-w-md">
            <div className="h-full flex flex-col bg-white shadow-xl">
              {/* Header */}
              <div className="px-4 py-6 bg-indigo-600 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <BellIcon className="h-6 w-6 text-white" />
                    <h2 className="text-lg font-medium text-white">
                      {t("notifications.title")}
                    </h2>
                  </div>
                  <button
                    onClick={onClose}
                    className="rounded-md text-indigo-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {notificationStats && (
                  <div className="mt-2 flex items-center justify-between text-sm text-indigo-200">
                    <span>
                      {t("notifications.unreadCount", {
                        count: notificationStats.stats.unread_count,
                      })}
                    </span>
                    {notificationStats.stats.unread_count > 0 && (
                      <button
                        onClick={() => markAllReadMutation.mutate()}
                        disabled={markAllReadMutation.isLoading}
                        className="text-indigo-200 hover:text-white underline"
                      >
                        {t("notifications.markAllRead")}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Filters */}
              <div className="px-4 py-2 border-b border-gray-200">
                <div className="flex space-x-4">
                  <button
                    onClick={() => setFilter("all")}
                    className={`px-3 py-1 rounded-md text-sm font-medium ${
                      filter === "all"
                        ? "bg-indigo-100 text-indigo-700"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {t("notifications.all")}
                  </button>
                  <button
                    onClick={() => setFilter("unread")}
                    className={`px-3 py-1 rounded-md text-sm font-medium ${
                      filter === "unread"
                        ? "bg-indigo-100 text-indigo-700"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {t("notifications.unread")}
                  </button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                  </div>
                ) : notifications?.notifications?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                    <BellIcon className="h-12 w-12 mb-2" />
                    <p className="text-sm">
                      {t("notifications.noNotifications")}
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {notifications?.notifications?.map((notification) => (
                      <li
                        key={notification.id}
                        className={`px-4 py-4 hover:bg-gray-50 cursor-pointer ${
                          !notification.is_read ? "bg-blue-50" : ""
                        }`}
                        onClick={() => handleMarkAsRead(notification)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p
                                className={`text-sm font-medium ${
                                  !notification.is_read
                                    ? "text-gray-900"
                                    : "text-gray-600"
                                }`}
                              >
                                {notification.title}
                              </p>
                              {!notification.is_read && (
                                <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-gray-400">
                                {formatRelativeTime(notification.created_at)}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotificationMutation.mutate(
                                    notification.id
                                  );
                                }}
                                className="text-gray-400 hover:text-red-500"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;
