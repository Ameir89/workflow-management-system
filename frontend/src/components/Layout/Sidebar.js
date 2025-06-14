// src/components/Layout/Sidebar.js
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import { taskService } from "../../services/taskService";
import {
  HomeIcon,
  Cog8ToothIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  UserGroupIcon,
  LinkIcon,
  FolderIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  SparklesIcon,
  ShieldCheckIcon,
  QuestionMarkCircleIcon,
  BookOpenIcon,
  TableCellsIcon,
  PencilSquareIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeIconSolid,
  Cog8ToothIcon as Cog8ToothIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  ClipboardDocumentListIcon as ClipboardDocumentListIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  LinkIcon as LinkIconSolid,
  FolderIcon as FolderIconSolid,
} from "@heroicons/react/24/solid";

const Sidebar = ({ isOpen, onClose, userPermissions = [] }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState({
    admin: false,
  });

  // Fetch task stats for sidebar
  const { data: taskStats } = useQuery(
    "sidebar-task-stats",
    () => taskService.getDashboardStats(),
    {
      refetchInterval: 60000,
      onError: () => {}, // Silently handle errors
    }
  );

  const hasAdminAccess =
    userPermissions.includes("*") ||
    userPermissions.some((p) => p.startsWith("manage_"));

  const navigation = [
    {
      name: t("nav.dashboard"),
      href: "/dashboard",
      icon: HomeIcon,
      iconSolid: HomeIconSolid,
      badge: null,
    },

    {
      name: t("nav.tasks"),
      href: "/tasks",
      icon: ClipboardDocumentListIcon,
      iconSolid: ClipboardDocumentListIconSolid,
      badge:
        taskStats?.stats?.pending_tasks > 0
          ? {
              count: taskStats.stats.pending_tasks,
              type: "warning",
            }
          : null,
    },

    {
      name: t("nav.reports"),
      href: "/reports",
      icon: ChartBarIcon,
      iconSolid: ChartBarIconSolid,
      badge: null,
    },
  ];

  const configurationNavigation = [
    {
      name: t("nav.forms"),
      href: "/forms",
      icon: DocumentTextIcon,
      iconSolid: DocumentTextIconSolid,
      badge: null,
    },
    {
      name: t("nav.files"),
      href: "/files",
      icon: FolderIcon,
      iconSolid: FolderIconSolid,
      badge: null,
    },
    {
      name: t("nav.webhooks"),
      href: "/webhooks",
      icon: LinkIcon,
      iconSolid: LinkIconSolid,
      badge: null,
    },
    {
      name: t("nav.workflows"),
      href: "/workflows",
      icon: Cog8ToothIcon,
      iconSolid: Cog8ToothIconSolid,
      badge: null,
    },
  ];

  const adminNavigation = [
    {
      name: t("nav.admin.users"),
      href: "/admin/users",
      icon: UserGroupIcon,
      iconSolid: UserGroupIconSolid,
    },
    {
      name: t("nav.admin.health"),
      href: "/admin/health",
      icon: ShieldCheckIcon,
      iconSolid: ShieldCheckIcon,
    },
    {
      name: t("nav.admin.lookupsManagement"),
      href: "/admin/lookups",
      icon: TableCellsIcon,
      iconSolid: TableCellsIcon,
    },
    {
      name: t("nav.admin.auditLogs"),
      href: "/admin/audit-logs",
      icon: PencilSquareIcon,
      iconSolid: PencilSquareIcon,
    },
  ];

  const isActive = (href) => {
    return (
      location.pathname === href || location.pathname.startsWith(href + "/")
    );
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const NavLink = ({ item, isAdmin = false }) => {
    const active = isActive(item.href);
    const IconComponent = active ? item.iconSolid : item.icon;

    return (
      <Link
        to={item.href}
        className={`
          group relative flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ease-in-out
          ${
            active
              ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25"
              : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          }
          ${isAdmin ? "ml-4" : ""}
        `}
        onClick={() => isOpen && window.innerWidth < 768 && onClose()}
      >
        {/* Active indicator */}
        {active && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r-full opacity-80"></div>
        )}

        {/* Icon */}
        <IconComponent
          className={`
            mr-3 h-6 w-6 flex-shrink-0 transition-all duration-200
            ${active ? "text-white" : "text-gray-500 group-hover:text-gray-700"}
          `}
        />

        {/* Label */}
        <span className="flex-1 truncate">{item.name}</span>

        {/* Badge */}
        {item.badge && (
          <span
            className={`
              ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full min-w-[20px] h-5
              ${
                item.badge.type === "warning"
                  ? "bg-yellow-100 text-yellow-800"
                  : item.badge.type === "danger"
                  ? "bg-red-100 text-red-800"
                  : item.badge.type === "success"
                  ? "bg-green-100 text-green-800"
                  : "bg-blue-100 text-blue-800"
              }
              ${active ? "bg-white/20 text-white" : ""}
            `}
          >
            {item.badge.count}
          </span>
        )}

        {/* Hover effect */}
        {!active && (
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 -z-10"></div>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity lg:hidden z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 flex w-72 flex-col transition-transform duration-300 ease-in-out lg:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white border-r border-gray-200 px-6 pb-4 shadow-xl">
          {/* Logo/Brand */}
          <div className="flex h-16 shrink-0 items-center border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
                <SparklesIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  WorkFlow
                </h1>
                <p className="text-xs text-gray-500 font-medium">
                  Management System
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex flex-1 flex-col space-y-2">
            {/* Main Navigation */}
            <div className="space-y-1">
              {navigation.map((item) => (
                <NavLink key={item.name} item={item} />
              ))}
            </div>

            {/* Admin Section */}
            {hasAdminAccess && (
              <>
                <div className="pt-4">
                  <button
                    onClick={() => toggleSection("configuration")}
                    className="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                  >
                    <span className="flex items-center">
                      <WrenchScrewdriverIcon className="mr-2 h-5 w-5 text-gray-500" />
                      {t("nav.configuration.title")}
                    </span>
                    {expandedSections.configuration ? (
                      <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                    )}
                  </button>

                  {expandedSections.configuration && (
                    <div className="mt-2 space-y-1">
                      {configurationNavigation.map((item) => (
                        <NavLink key={item.name} item={item} isAdmin />
                      ))}
                    </div>
                  )}
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => toggleSection("admin")}
                    className="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                  >
                    <span className="flex items-center">
                      <ShieldCheckIcon className="mr-2 h-5 w-5 text-gray-500" />
                      {t("nav.admin.title")}
                    </span>
                    {expandedSections.admin ? (
                      <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                    )}
                  </button>

                  {expandedSections.admin && (
                    <div className="mt-2 space-y-1">
                      {adminNavigation.map((item) => (
                        <NavLink key={item.name} item={item} isAdmin />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Spacer */}
            <div className="flex-1"></div>

            {/* Bottom Section */}
            <div className="border-t border-gray-200 pt-4 space-y-3">
              {/* Quick Stats */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide">
                      Active Tasks
                    </p>
                    <p className="text-2xl font-bold text-indigo-900">
                      {taskStats?.stats?.pending_tasks || 0}
                    </p>
                  </div>
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <ClipboardDocumentListIcon className="h-6 w-6 text-indigo-600" />
                  </div>
                </div>
                <div className="mt-2 flex items-center text-xs text-indigo-600">
                  <span className="inline-flex items-center">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></span>
                    {taskStats?.stats?.overdue_tasks || 0} overdue
                  </span>
                </div>
              </div>

              {/* Help/Support */}
              <div className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors duration-200 cursor-pointer">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-200 rounded-lg">
                    <QuestionMarkCircleIcon className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      Need Help?
                    </p>
                    <p className="text-xs text-gray-500">
                      Check our documentation
                    </p>
                  </div>
                  <BookOpenIcon className="h-4 w-4 text-gray-400" />
                </div>
              </div>

              {/* Version Info */}
              <div className="text-center">
                <p className="text-xs text-gray-400">Version 1.0.0</p>
              </div>
            </div>
          </nav>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
