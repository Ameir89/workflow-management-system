import React from "react";
import { useQuery } from "react-query";
import { useTranslation } from "react-i18next";
import { adminService } from "../../services/adminService";
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ServerIcon,
  CircleStackIcon, // Use this instead of DatabaseIcon
  CpuChipIcon,
} from "@heroicons/react/24/outline";

const SystemHealth = () => {
  const { t } = useTranslation();

  const {
    data: healthData,
    isLoading,
    error,
  } = useQuery(
    "system-health",
    () => adminService.getSystemHealth(),
    { refetchInterval: 30000 } // Refresh every 30 seconds
  );

  const getStatusIcon = (status) => {
    switch (status) {
      case "healthy":
      case "connected":
      case "available":
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case "degraded":
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "healthy":
      case "connected":
      case "available":
        return "text-green-800 bg-green-100";
      case "degraded":
        return "text-yellow-800 bg-yellow-100";
      default:
        return "text-red-800 bg-red-100";
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
        <XCircleIcon className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          {t("admin.health.error")}
        </h3>
        <p className="mt-1 text-sm text-gray-500">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t("admin.health.title")}
        </h1>
        <p className="text-gray-600">{t("admin.health.subtitle")}</p>
      </div>

      {/* Overall Status */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon(healthData?.status)}
            <div>
              <h2 className="text-lg font-medium text-gray-900">
                {t("admin.health.overallStatus")}
              </h2>
              <p className="text-sm text-gray-500">
                {t("admin.health.lastChecked")}: {new Date().toLocaleString()}
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
              healthData?.status
            )}`}
          >
            {healthData?.status}
          </span>
        </div>
      </div>

      {/* Service Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center space-x-3">
            <CircleStackIcon className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm font-medium text-gray-500">
                {t("admin.health.database")}
              </p>
              <div className="flex items-center space-x-2">
                {getStatusIcon(healthData?.database)}
                <span className="text-sm text-gray-900">
                  {healthData?.database}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center space-x-3">
            <CircleStackIcon className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-sm font-medium text-gray-500">
                {t("admin.health.redis")}
              </p>
              <div className="flex items-center space-x-2">
                {getStatusIcon(healthData?.redis)}
                <span className="text-sm text-gray-900">
                  {healthData?.redis}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center space-x-3">
            <ServerIcon className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm font-medium text-gray-500">
                {t("admin.health.storage")}
              </p>
              <div className="flex items-center space-x-2">
                {getStatusIcon(healthData?.storage)}
                <span className="text-sm text-gray-900">
                  {healthData?.storage}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center space-x-3">
            <CpuChipIcon className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-sm font-medium text-gray-500">
                {t("admin.health.version")}
              </p>
              <span className="text-sm text-gray-900">
                {healthData?.version}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {healthData?.stats && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {t("admin.health.statistics")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-semibold text-indigo-600">
                {healthData.stats.total_users}
              </p>
              <p className="text-sm text-gray-500">
                {t("admin.health.totalUsers")}
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-green-600">
                {healthData.stats.total_workflows}
              </p>
              <p className="text-sm text-gray-500">
                {t("admin.health.totalWorkflows")}
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-yellow-600">
                {healthData.stats.total_instances}
              </p>
              <p className="text-sm text-gray-500">
                {t("admin.health.totalInstances")}
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-purple-600">
                {healthData.stats.total_tasks}
              </p>
              <p className="text-sm text-gray-500">
                {t("admin.health.totalTasks")}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemHealth;
