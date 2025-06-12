import React, { useState, useEffect } from "react";
import { useQuery } from "react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { taskService } from "../../services/taskService";
import { workflowService } from "../../services/workflowService";
import StatsCard from "../Common/StatsCard";
import RecentTasks from "./RecentTasks";
import "./Dashboard.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const { t } = useTranslation();

  // Fetch dashboard data
  const { data: taskStats, isLoading: tasksLoading } = useQuery(
    "task-dashboard-stats",
    taskService.getDashboardStats,
    { refetchInterval: 30000 }
  );

  const { data: workflowStats, isLoading: workflowsLoading } = useQuery(
    "workflow-dashboard-stats",
    workflowService.getDashboardStats,
    { refetchInterval: 60000 }
  );

  // Chart configurations
  const taskStatusData = {
    labels: [
      t("dashboard.pending"),
      t("dashboard.inProgress"),
      t("dashboard.completed"),
      t("dashboard.overdue"),
    ],
    datasets: [
      {
        data: taskStats
          ? [
              taskStats.stats.pending_tasks,
              taskStats.stats.in_progress_tasks,
              taskStats.stats.completed_tasks,
              taskStats.stats.overdue_tasks,
            ]
          : [0, 0, 0, 0],
        backgroundColor: [
          "#FEF3C7", // pending - yellow
          "#DBEAFE", // in progress - blue
          "#D1FAE5", // completed - green
          "#FEE2E2", // overdue - red
        ],
        borderColor: ["#F59E0B", "#3B82F6", "#10B981", "#EF4444"],
        borderWidth: 2,
      },
    ],
  };

  const workflowTrendData = {
    labels: workflowStats?.trend?.map((item) => item.date) || [],
    datasets: [
      {
        label: t("dashboard.workflowsStarted"),
        data: workflowStats?.trend?.map((item) => item.started) || [],
        backgroundColor: "rgba(59, 130, 246, 0.5)",
        borderColor: "rgba(59, 130, 246, 1)",
        borderWidth: 2,
      },
      {
        label: t("dashboard.workflowsCompleted"),
        data: workflowStats?.trend?.map((item) => item.completed) || [],
        backgroundColor: "rgba(16, 185, 129, 0.5)",
        borderColor: "rgba(16, 185, 129, 1)",
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "right",
      },
    },
  };

  if (tasksLoading || workflowsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {t("dashboard.title")}
        </h1>
        <p className="text-gray-600">{t("dashboard.welcome")}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title={t("dashboard.totalTasks")}
          value={taskStats?.stats?.total_tasks || 0}
          icon="clipboard-list"
          color="blue"
          link="/tasks"
        />
        <StatsCard
          title={t("dashboard.pendingTasks")}
          value={taskStats?.stats?.pending_tasks || 0}
          icon="clock"
          color="yellow"
          link="/tasks?status=pending"
        />
        <StatsCard
          title={t("dashboard.overdueTasks")}
          value={taskStats?.stats?.overdue_tasks || 0}
          icon="exclamation-triangle"
          color="red"
          link="/tasks?status=overdue"
        />
        <StatsCard
          title={t("dashboard.completionRate")}
          value={`${taskStats?.stats?.completion_rate || 0}%`}
          icon="chart-pie"
          color="green"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Task Status Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t("dashboard.taskDistribution")}
          </h3>
          <div className="h-64">
            <Doughnut data={taskStatusData} options={doughnutOptions} />
          </div>
        </div>

        {/* Workflow Trends */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t("dashboard.workflowTrends")}
          </h3>
          <div className="h-64">
            <Bar data={workflowTrendData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Recent Tasks and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tasks */}
        <div className="lg:col-span-2">
          <RecentTasks tasks={taskStats?.recent_tasks || []} />
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t("dashboard.quickActions")}
          </h3>
          <div className="space-y-3">
            <Link
              to="/workflows/designer"
              className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-indigo-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  {t("dashboard.createWorkflow")}
                </p>
                <p className="text-xs text-gray-500">
                  {t("dashboard.designNewWorkflow")}
                </p>
              </div>
            </Link>

            <Link
              to="/tasks"
              className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  {t("dashboard.viewAllTasks")}
                </p>
                <p className="text-xs text-gray-500">
                  {t("dashboard.manageYourTasks")}
                </p>
              </div>
            </Link>

            <Link
              to="/reports"
              className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-purple-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  {t("dashboard.viewReports")}
                </p>
                <p className="text-xs text-gray-500">
                  {t("dashboard.analyzePerformance")}
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
