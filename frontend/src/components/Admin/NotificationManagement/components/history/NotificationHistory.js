// src/components/Admin/NotificationManagement/components/history/NotificationHistory.js
import React from "react";
import { useTranslation } from "react-i18next";
import { ClockIcon } from "@heroicons/react/24/outline";

import NotificationFilters from "../common/NotificationFilters";
import HistoryTable from "./HistoryTable";
import LoadingSpinner from "../../../../Common/LoadingSpinner";
import EmptyState from "../../../../Common/EmptyState";

const NotificationHistory = ({
  data,
  isLoading,
  search,
  setSearch,
  filters,
  setFilters,
}) => {
  const { t } = useTranslation();

  const historyFilterOptions = {
    status: [
      { value: "", label: t("notifications.allStatus") },
      { value: "delivered", label: t("notifications.delivered") },
      { value: "failed", label: t("notifications.failed") },
      { value: "pending", label: t("notifications.pending") },
    ],
    channel: [
      { value: "", label: t("notifications.allChannels") },
      { value: "email", label: t("notifications.channelEmail") },
      { value: "sms", label: t("notifications.channelSMS") },
      { value: "in_app", label: t("notifications.channelInApp") },
    ],
    date_range: [
      { value: "", label: t("notifications.allTime") },
      { value: "today", label: t("notifications.today") },
      { value: "week", label: t("notifications.thisWeek") },
      { value: "month", label: t("notifications.thisMonth") },
      { value: "quarter", label: t("notifications.thisQuarter") },
    ],
  };

  if (isLoading) {
    return <LoadingSpinner message={t("common.loading")} />;
  }

  const notifications = data?.notifications || [];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <NotificationFilters
        search={search}
        setSearch={setSearch}
        filters={filters}
        setFilters={setFilters}
        filterOptions={historyFilterOptions}
      />

      {/* Results */}
      {notifications.length > 0 ? (
        <HistoryTable notifications={notifications} />
      ) : (
        <EmptyState
          icon={ClockIcon}
          title={t("notifications.noNotificationHistory")}
          description={t("notifications.noHistoryDesc")}
        />
      )}
    </div>
  );
};

export default NotificationHistory;
