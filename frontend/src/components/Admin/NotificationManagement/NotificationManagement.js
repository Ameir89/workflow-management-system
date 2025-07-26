// src/components/Admin/NotificationManagement/NotificationManagement.js
import React, { useState } from "react";
import { useQuery } from "react-query";
import { useTranslation } from "react-i18next";
import { BellIcon as BellIconSolid } from "@heroicons/react/24/solid";

import { notificationManagementService } from "../../../services/notificationManagementService";
import NotificationStats from "./components/NotificationStats";
import NotificationTabs from "./components/NotificationTabs";
import TemplatesList from "./components/Templates/TemplatesList";
import NotificationHistory from "./components/history/NotificationHistory";
import NotificationSettings from "./components/Settings/NotificationSettings";
import Pagination from "../../Common/Pagination"; // Reuse existing Pagination
import { useNotificationManagement } from "./hooks/useNotificationManagement";

const NotificationManagement = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("templates");

  const {
    page,
    setPage,
    search,
    setSearch,
    filters,
    setFilters,
    selectedItems,
    setSelectedItems,
    resetFilters,
  } = useNotificationManagement();

  // Fetch analytics data for stats
  const { data: analyticsData } = useQuery(
    ["notification-analytics"],
    () => notificationManagementService.getAnalytics(),
    {
      enabled: true,
      refetchInterval: 60000, // Refresh every minute
    }
  );

  // Fetch templates data
  const { data: templatesData, isLoading: templatesLoading } = useQuery(
    ["notification-templates", page, search, filters],
    () =>
      notificationManagementService.getTemplates({
        page,
        limit: 20,
        search,
        ...filters,
      }),
    {
      keepPreviousData: true,
      enabled: activeTab === "templates",
    }
  );

  // Fetch history data
  const { data: historyData, isLoading: historyLoading } = useQuery(
    ["notification-history", page, search, filters],
    () =>
      notificationManagementService.getNotificationHistory({
        page,
        limit: 20,
        search,
        ...filters,
      }),
    {
      keepPreviousData: true,
      enabled: activeTab === "history",
    }
  );

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setPage(1);
    setSelectedItems([]);
  };

  const tabs = [
    {
      id: "templates",
      name: t("notifications.templates"),
      count: templatesData?.pagination?.total,
    },
    {
      id: "history",
      name: t("notifications.history"),
      count: historyData?.pagination?.total,
    },
    {
      id: "settings",
      name: t("notifications.settings"),
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "templates":
        return (
          <TemplatesList
            data={templatesData}
            isLoading={templatesLoading}
            search={search}
            setSearch={setSearch}
            filters={filters}
            setFilters={setFilters}
            resetFilters={resetFilters}
            selectedItems={selectedItems}
            setSelectedItems={setSelectedItems}
          />
        );
      case "history":
        return (
          <NotificationHistory
            data={historyData}
            isLoading={historyLoading}
            search={search}
            setSearch={setSearch}
            filters={filters}
            setFilters={setFilters}
          />
        );
      case "settings":
        return <NotificationSettings />;
      default:
        return null;
    }
  };

  const currentData = activeTab === "templates" ? templatesData : historyData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <BellIconSolid className="h-8 w-8 text-indigo-600 mr-3" />
            {t("notifications.title")}
          </h1>
          <p className="text-gray-600">{t("notifications.description")}</p>
        </div>
      </div>

      {/* Stats */}
      {analyticsData && <NotificationStats analytics={analyticsData} />}

      {/* Main Content */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <NotificationTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />

        <div className="p-6">{renderTabContent()}</div>
      </div>

      {/* Pagination - Reuse existing component */}
      {currentData?.pagination && (
        <Pagination
          pagination={currentData.pagination}
          currentPage={page}
          onPageChange={setPage}
        />
      )}
    </div>
  );
};

export default NotificationManagement;
