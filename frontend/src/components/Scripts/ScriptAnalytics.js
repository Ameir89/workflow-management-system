// src/components/Scripts/ScriptAnalytics.js
import React, { useState } from "react";
import { useQuery } from "react-query";
import { useTranslation } from "react-i18next";
import { scriptsService } from "../../services/scriptsService";
import {
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarDaysIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

const ScriptAnalytics = () => {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState("30d");
  const [selectedScript, setSelectedScript] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Fetch analytics data
  const {
    data: analyticsData,
    isLoading,
    error,
    refetch,
  } = useQuery(
    ["script-analytics", timeRange, selectedScript, selectedCategory],
    () =>
      scriptsService.getScriptAnalytics({
        time_range: timeRange,
        script_id: selectedScript || undefined,
        category: selectedCategory || undefined,
      }),
    {
      keepPreviousData: true,
      refetchInterval: 300000, // Refresh every 5 minutes
    }
  );

  // Fetch scripts for filter
  const { data: scriptsData } = useQuery(["scripts-list"], () =>
    scriptsService.getScripts({ limit: 100 })
  );

  // Fetch categories for filter
  const { data: categories } = useQuery(
    ["script-categories"],
    scriptsService.getScriptCategories
  );

  const formatDuration = (durationMs) => {
    if (!durationMs) return "0ms";

    if (durationMs < 1000) {
      return `${Math.round(durationMs)}ms`;
    } else if (durationMs < 60000) {
      return `${(durationMs / 1000).toFixed(2)}s`;
    } else {
      const minutes = Math.floor(durationMs / 60000);
      const seconds = ((durationMs % 60000) / 1000).toFixed(0);
      return `${minutes}m ${seconds}s`;
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  const getChangeIcon = (change) => {
    if (change > 0) {
      return <XCircleIcon className="h-4 w-4 text-green-500" />;
    } else if (change < 0) {
      return <XCircleIcon className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  const getChangeColor = (change) => {
    if (change > 0) return "text-green-600";
    if (change < 0) return "text-red-600";
    return "text-gray-600";
  };

  const MetricCard = ({ title, value, change, icon: Icon, color }) => (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
          {change !== undefined && (
            <div className="flex items-center mt-1">
              {getChangeIcon(change)}
              <span
                className={`text-sm font-medium ml-1 ${getChangeColor(change)}`}
              >
                {change > 0 ? "+" : ""}
                {change}%
              </span>
              <span className="text-sm text-gray-500 ml-1">vs last period</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );

  const PerformanceChart = ({ data, title }) => {
    if (!data || data.length === 0) {
      return (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
          <div className="text-center py-8 text-gray-500">
            <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm">No data available</p>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
        <div className="space-y-4">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    {item.label}
                  </span>
                  <span className="text-sm text-gray-500">{item.value}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full"
                    style={{ width: `${item.percentage || 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const TopScriptsTable = ({ scripts }) => (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          Top Performing Scripts
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Script
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Executions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Success Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Executed
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {scripts?.map((script) => (
              <tr key={script.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {script.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {script.category}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatNumber(script.execution_count)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span
                      className={`text-sm font-medium ${
                        script.success_rate >= 95
                          ? "text-green-600"
                          : script.success_rate >= 85
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}
                    >
                      {script.success_rate}%
                    </span>
                    {script.success_rate >= 95 ? (
                      <CheckCircleIcon className="h-4 w-4 text-green-500 ml-1" />
                    ) : script.success_rate < 85 ? (
                      <XCircleIcon className="h-4 w-4 text-red-500 ml-1" />
                    ) : null}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDuration(script.avg_duration_ms)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {script.last_executed
                    ? new Date(script.last_executed).toLocaleDateString()
                    : "Never"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

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
          Error Loading Analytics
        </h3>
        <p className="mt-1 text-sm text-gray-500">{error.message}</p>
        <button
          onClick={() => refetch()}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <ArrowPathIcon className="h-4 w-4 mr-2" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Script Analytics
          </h2>
          <p className="text-sm text-gray-600">
            Monitor script performance and execution metrics
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time Range
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Script
            </label>
            <select
              value={selectedScript}
              onChange={(e) => setSelectedScript(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Scripts</option>
              {scriptsData?.scripts?.map((script) => (
                <option key={script.id} value={script.id}>
                  {script.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Categories</option>
              {categories?.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Executions"
          value={formatNumber(analyticsData?.metrics?.total_executions || 0)}
          change={analyticsData?.metrics?.execution_change}
          icon={ChartBarIcon}
          color="bg-blue-100 text-blue-600"
        />

        <MetricCard
          title="Success Rate"
          value={`${analyticsData?.metrics?.success_rate || 0}%`}
          change={analyticsData?.metrics?.success_rate_change}
          icon={CheckCircleIcon}
          color="bg-green-100 text-green-600"
        />

        <MetricCard
          title="Average Duration"
          value={formatDuration(analyticsData?.metrics?.avg_duration_ms || 0)}
          change={analyticsData?.metrics?.duration_change}
          icon={ClockIcon}
          color="bg-purple-100 text-purple-600"
        />

        <MetricCard
          title="Active Scripts"
          value={formatNumber(analyticsData?.metrics?.active_scripts || 0)}
          change={analyticsData?.metrics?.active_scripts_change}
          icon={CalendarDaysIcon}
          color="bg-orange-100 text-orange-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PerformanceChart
          data={analyticsData?.execution_trends}
          title="Execution Trends"
        />

        <PerformanceChart
          data={analyticsData?.error_types}
          title="Common Error Types"
        />
      </div>

      {/* Performance by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PerformanceChart
          data={analyticsData?.category_performance}
          title="Performance by Category"
        />

        <PerformanceChart
          data={analyticsData?.language_usage}
          title="Language Usage"
        />
      </div>

      {/* Top Scripts Table */}
      {analyticsData?.top_scripts && (
        <TopScriptsTable scripts={analyticsData.top_scripts} />
      )}

      {/* System Resource Usage */}
      {analyticsData?.resource_usage && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Resource Usage
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-semibold text-gray-900">
                {analyticsData.resource_usage.avg_memory_mb}MB
              </div>
              <div className="text-sm text-gray-500">Average Memory</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-gray-900">
                {analyticsData.resource_usage.avg_cpu_percent}%
              </div>
              <div className="text-sm text-gray-500">Average CPU</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-gray-900">
                {analyticsData.resource_usage.concurrent_executions}
              </div>
              <div className="text-sm text-gray-500">Peak Concurrent</div>
            </div>
          </div>
        </div>
      )}

      {/* Insights and Recommendations */}
      {analyticsData?.insights && analyticsData.insights.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-4">
            Insights & Recommendations
          </h3>
          <div className="space-y-3">
            {analyticsData.insights.map((insight, index) => (
              <div key={index} className="flex items-start">
                <div className="flex-shrink-0">
                  <XCircleIcon className="h-5 w-5 text-blue-500 mt-0.5" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-800">{insight.message}</p>
                  {insight.recommendation && (
                    <p className="text-sm text-blue-600 mt-1">
                      <strong>Recommendation:</strong> {insight.recommendation}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScriptAnalytics;
