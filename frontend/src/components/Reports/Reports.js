import React, { useState } from "react";
import { useQuery } from "react-query";
import { useTranslation } from "react-i18next";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Pie, Line } from "react-chartjs-2";
import { api } from "../../services/authService";
import {
  ChartBarIcon,
  DocumentArrowDownIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Reports = () => {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  const { data: performanceData, isLoading: performanceLoading } = useQuery(
    ["performance-report", dateRange],
    () => fetchPerformanceReport(dateRange),
    { refetchOnWindowFocus: false }
  );

  const { data: slaData, isLoading: slaLoading } = useQuery(
    "sla-compliance",
    () => fetchSLACompliance(),
    { refetchOnWindowFocus: false }
  );

  const fetchPerformanceReport = async (dateRange) => {
    try {
      const response = await api.get("/reports/performance", {
        params: {
          start_date: dateRange.start,
          end_date: dateRange.end,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error("Failed to fetch performance report");
    }
  };

  const fetchSLACompliance = async () => {
    try {
      const response = await api.get("/reports/sla-compliance");
      return response.data;
    } catch (error) {
      throw new Error("Failed to fetch SLA compliance data");
    }
  };

  const exportReport = async (reportType) => {
    try {
      const response = await api.get(`/reports/export/${reportType}`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${reportType}_report.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  // Chart configurations
  const workflowPerformanceChart = {
    labels:
      performanceData?.workflow_performance?.map((w) => w.workflow_name) || [],
    datasets: [
      {
        label: "Total Instances",
        data:
          performanceData?.workflow_performance?.map(
            (w) => w.total_instances
          ) || [],
        backgroundColor: "rgba(59, 130, 246, 0.5)",
        borderColor: "rgba(59, 130, 246, 1)",
        borderWidth: 1,
      },
      {
        label: "Completed",
        data:
          performanceData?.workflow_performance?.map(
            (w) => w.completed_instances
          ) || [],
        backgroundColor: "rgba(16, 185, 129, 0.5)",
        borderColor: "rgba(16, 185, 129, 1)",
        borderWidth: 1,
      },
    ],
  };

  const slaComplianceChart = {
    labels: slaData?.compliance_by_workflow?.map((w) => w.workflow_name) || [],
    datasets: [
      {
        label: "Compliance Rate (%)",
        data:
          slaData?.compliance_by_workflow?.map((w) => w.compliance_rate) || [],
        backgroundColor:
          slaData?.compliance_by_workflow?.map((w) =>
            w.compliance_rate >= 90
              ? "rgba(16, 185, 129, 0.5)"
              : w.compliance_rate >= 70
              ? "rgba(245, 158, 11, 0.5)"
              : "rgba(239, 68, 68, 0.5)"
          ) || [],
        borderColor:
          slaData?.compliance_by_workflow?.map((w) =>
            w.compliance_rate >= 90
              ? "rgba(16, 185, 129, 1)"
              : w.compliance_rate >= 70
              ? "rgba(245, 158, 11, 1)"
              : "rgba(239, 68, 68, 1)"
          ) || [],
        borderWidth: 1,
      },
    ],
  };

  const dailyActivityChart = {
    labels: performanceData?.daily_activity?.map((d) => d.date) || [],
    datasets: [
      {
        label: "Workflows Started",
        data:
          performanceData?.daily_activity?.map((d) => d.workflows_started) ||
          [],
        borderColor: "rgba(59, 130, 246, 1)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.1,
      },
      {
        label: "Workflows Completed",
        data:
          performanceData?.daily_activity?.map((d) => d.workflows_completed) ||
          [],
        borderColor: "rgba(16, 185, 129, 1)",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        tension: 0.1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  if (performanceLoading || slaLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600">Analytics and insights</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => exportReport("workflow_instances")}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
            Export Workflows
          </button>
          <button
            onClick={() => exportReport("tasks")}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
            Export Tasks
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center space-x-4">
          <CalendarIcon className="h-5 w-5 text-gray-400" />
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">From:</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange({ ...dateRange, start: e.target.value })
              }
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">To:</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange({ ...dateRange, end: e.target.value })
              }
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workflow Performance */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Workflow Performance
          </h3>
          <div className="h-64">
            <Bar data={workflowPerformanceChart} options={chartOptions} />
          </div>
        </div>

        {/* SLA Compliance */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            SLA Compliance
          </h3>
          <div className="h-64">
            <Bar data={slaComplianceChart} options={chartOptions} />
          </div>
        </div>

        {/* Daily Activity */}
        <div className="bg-white p-6 rounded-lg shadow lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Daily Activity Trend
          </h3>
          <div className="h-64">
            <Line data={dailyActivityChart} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">
                Total Workflows
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {performanceData?.workflow_performance?.length || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">
                Avg Completion Rate
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {performanceData?.workflow_performance?.length > 0
                  ? Math.round(
                      performanceData.workflow_performance.reduce(
                        (acc, w) =>
                          acc +
                          (w.completed_instances / w.total_instances) * 100,
                        0
                      ) / performanceData.workflow_performance.length
                    )
                  : 0}
                %
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-yellow-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">
                Avg SLA Compliance
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {slaData?.compliance_by_workflow?.length > 0
                  ? Math.round(
                      slaData.compliance_by_workflow.reduce(
                        (acc, w) => acc + w.compliance_rate,
                        0
                      ) / slaData.compliance_by_workflow.length
                    )
                  : 0}
                %
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent SLA Breaches */}
      {slaData?.recent_breaches && slaData.recent_breaches.length > 0 && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Recent SLA Breaches
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Latest SLA violations requiring attention
            </p>
          </div>
          <ul className="divide-y divide-gray-200">
            {slaData.recent_breaches.slice(0, 5).map((breach, index) => (
              <li key={index} className="px-4 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {breach.workflow_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {breach.instance_title} - {breach.task_name}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        breach.escalation_level >= 3
                          ? "bg-red-100 text-red-800"
                          : breach.escalation_level >= 2
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      Level {breach.escalation_level}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(breach.breach_time).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Reports;
