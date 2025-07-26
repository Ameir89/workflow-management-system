import React, { useState } from "react";
import { useQuery } from "react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { taskService } from "../../services/taskService";
import {
  ClipboardDocumentListIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserIcon,
  DocumentTextIcon,
  ChartBarIcon,
  PlayIcon,
} from "@heroicons/react/24/outline";
import Pagination from "../Common/Pagination";
import StatsCard from "../Common/StatsCard";

const TaskList = () => {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({});

  const { data: tasksData, isLoading } = useQuery(
    ["tasks", page, filters],
    () => taskService.getTasks({ page, limit: 20, ...filters }),
    { keepPreviousData: true }
  );

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case "pending":
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case "in_progress":
        return <PlayIcon className="h-5 w-5 text-blue-500" />;
      case "overdue":
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "text-green-800 bg-green-100";
      case "pending":
        return "text-yellow-800 bg-yellow-100";
      case "in_progress":
        return "text-blue-800 bg-blue-100";
      case "overdue":
        return "text-red-800 bg-red-100";
      default:
        return "text-gray-800 bg-gray-100";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "text-red-600";
      case "medium":
        return "text-yellow-600";
      case "low":
        return "text-green-600";
      default:
        return "text-gray-600";
    }
  };

  // Statistics cards configuration
  const getStatsCards = (statistics) => {
    if (!statistics) return [];

    return [
      {
        title: t("tasks.totalTasks"),
        value: statistics.total_tasks || 0,
        icon: "clipboard-list",
        color: "blue",
      },
      {
        title: t("tasks.pendingTasks"),
        value: statistics.pending_count || 0,
        icon: "clock",
        color: "yellow",
      },
      {
        title: t("tasks.inProgressTasks"),
        value: statistics.in_progress_count || 0,
        icon: "chart-pie",
        color: "blue",
      },
      {
        title: t("tasks.completedTasks"),
        value: statistics.completed_count || 0,
        icon: "clipboard-list",
        color: "green",
      },
      {
        title: t("tasks.overdueTasks"),
        value: statistics.overdue_count || 0,
        icon: "exclamation-triangle",
        color: "red",
      },
    ];
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const statsCards = getStatsCards(tasksData?.statistics);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("tasks.title")}</h1>
        <p className="text-gray-600">{t("tasks.subtitle")}</p>
      </div>

      {/* Statistics Cards */}
      {statsCards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {statsCards.map((card, index) => (
            <StatsCard
              key={index}
              title={card.title}
              value={card.value}
              icon={card.icon}
              color={card.color}
            />
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("common.status")}
            </label>
            <select
              value={filters.status || ""}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{t("common.all")}</option>
              <option value="pending">{t("tasks.pending")}</option>
              <option value="in_progress">{t("tasks.inProgress")}</option>
              <option value="completed">{t("tasks.completed")}</option>
              <option value="overdue">{t("tasks.overdue")}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("tasks.priority")}
            </label>
            <select
              value={filters.priority || ""}
              onChange={(e) =>
                setFilters({ ...filters, priority: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{t("common.all")}</option>
              <option value="high">{t("tasks.priorityLevels.high")}</option>
              <option value="medium">{t("tasks.priorityLevels.medium")}</option>
              <option value="low">{t("tasks.priorityLevels.low")}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("tasks.assignedTo")}
            </label>
            <select
              value={filters.assigned_to || ""}
              onChange={(e) =>
                setFilters({ ...filters, assigned_to: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{t("common.all")}</option>
              <option value="me">{t("tasks.assignedToMe")}</option>
              <option value="unassigned">{t("tasks.unassigned")}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("tasks.type")}
            </label>
            <select
              value={filters.type || ""}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{t("common.all")}</option>
              <option value="approval">{t("tasks.approvalTasks")}</option>
              <option value="form">{t("tasks.formTasks")}</option>
              <option value="manual">{t("tasks.manualTasks")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {tasksData?.tasks?.map((task) => (
            <li key={task.id}>
              <Link to={`/tasks/${task.id}`} className="block hover:bg-gray-50">
                <div className="px-4 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        {getStatusIcon(task.status)}
                        <p className="ml-2 text-sm font-medium text-indigo-600 truncate">
                          {task.name}
                        </p>
                        {task.form_id && (
                          <DocumentTextIcon
                            className="ml-2 h-4 w-4 text-gray-400"
                            title={t("tasks.hasForm")}
                          />
                        )}
                        {task.type === "approval" && (
                          <ChartBarIcon
                            className="ml-2 h-4 w-4 text-purple-400"
                            title={t("tasks.approvalTask")}
                          />
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate mt-1">
                        {t("tasks.id")}: {task.id}
                      </p>
                      <p className="text-sm text-gray-500 truncate mt-1">
                        {task.workflow_title}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span
                        className={`text-sm font-medium ${getPriorityColor(
                          task.priority
                        )}`}
                      >
                        {task.priority}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          task.status
                        )}`}
                      >
                        {task.status}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <UserIcon className="h-4 w-4 mr-1" />
                    <span>
                      {task.assigned_to_name || t("tasks.unassigned")}
                    </span>
                    {task.due_date && (
                      <>
                        <span className="mx-2">•</span>
                        <ClockIcon className="h-4 w-4 mr-1" />
                        <span>
                          {t("tasks.due")}{" "}
                          {new Date(task.due_date).toLocaleString()}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Empty State */}
      {tasksData?.tasks?.length === 0 && (
        <div className="text-center py-12">
          <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {t("tasks.noTasks")}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {t("tasks.noTasksDescription")}
          </p>
        </div>
      )}

      {/* Pagination using Common Component */}
      {tasksData?.pagination && (
        <Pagination
          pagination={tasksData.pagination}
          currentPage={page}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
};

export default TaskList;
