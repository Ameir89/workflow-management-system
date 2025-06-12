import React, { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import { useAuth } from "../../hooks/useAuth";
import { notificationsService } from "../../services/notificationsService";
import NotificationCenter from "../Notifications/NotificationCenter";
import {
  HomeIcon,
  Cog8ToothIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon, // Use this instead of TaskIcon
  ChartBarIcon,
  UserGroupIcon,
  BellIcon,
  Bars3Icon,
  XMarkIcon,
  LinkIcon,
  FolderIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

const Layout = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);

  const { data: notificationStats } = useQuery(
    "notification-stats",
    () => notificationsService.getNotificationStats(),
    { refetchInterval: 30000 }
  );

  const navigation = [
    { name: t("nav.dashboard"), href: "/dashboard", icon: HomeIcon },
    { name: t("nav.workflows"), href: "/workflows", icon: Cog8ToothIcon },
    { name: t("nav.tasks"), href: "/tasks", icon: ClipboardDocumentListIcon },
    { name: t("nav.forms"), href: "/forms", icon: DocumentTextIcon },
    { name: t("nav.files"), href: "/files", icon: FolderIcon },
    { name: t("nav.webhooks"), href: "/webhooks", icon: LinkIcon },
    { name: t("nav.reports"), href: "/reports", icon: ChartBarIcon },
  ];

  const adminNavigation = [
    { name: t("nav.admin.users"), href: "/admin/users", icon: UserGroupIcon },
    { name: t("nav.admin.health"), href: "/admin/health", icon: ChartBarIcon },
  ];

  const userPermissions = user?.permissions || [];
  const hasAdminAccess =
    userPermissions.includes("*") ||
    userPermissions.some((p) => p.startsWith("manage_"));

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === "en" ? "ar" : "en";
    i18n.changeLanguage(newLang);
    document.dir = newLang === "ar" ? "rtl" : "ltr";
  };

  const isActive = (href) => {
    return (
      location.pathname === href || location.pathname.startsWith(href + "/")
    );
  };

  const NavLink = ({ item, mobile = false }) => (
    <Link
      to={item.href}
      className={`${
        isActive(item.href)
          ? "bg-indigo-700 text-white"
          : "text-indigo-200 hover:text-white hover:bg-indigo-600"
      } group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
        mobile ? "text-base" : ""
      }`}
      onClick={() => mobile && setSidebarOpen(false)}
    >
      <item.icon
        className={`${
          isActive(item.href)
            ? "text-white"
            : "text-indigo-400 group-hover:text-white"
        } mr-3 flex-shrink-0 h-6 w-6`}
      />
      {item.name}
    </Link>
  );

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Mobile sidebar */}
      <div
        className={`fixed inset-0 flex z-40 md:hidden ${
          sidebarOpen ? "" : "hidden"
        }`}
      >
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75"
          onClick={() => setSidebarOpen(false)}
        />
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-indigo-800">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              onClick={() => setSidebarOpen(false)}
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            >
              <XMarkIcon className="h-6 w-6 text-white" />
            </button>
          </div>
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <h1 className="text-white text-lg font-semibold">
                {t("app.title")}
              </h1>
            </div>
            <nav className="mt-5 px-2 space-y-1">
              {navigation.map((item) => (
                <NavLink key={item.name} item={item} mobile />
              ))}
              {hasAdminAccess && (
                <>
                  <div className="border-t border-indigo-700 mt-4 pt-4">
                    <p className="px-2 text-xs font-semibold text-indigo-200 uppercase tracking-wide">
                      {t("nav.admin.title")}
                    </p>
                  </div>
                  {adminNavigation.map((item) => (
                    <NavLink key={item.name} item={item} mobile />
                  ))}
                </>
              )}
            </nav>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 bg-indigo-800">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <h1 className="text-white text-lg font-semibold">
                  {t("app.title")}
                </h1>
              </div>
              <nav className="mt-5 flex-1 px-2 space-y-1">
                {navigation.map((item) => (
                  <NavLink key={item.name} item={item} />
                ))}
                {hasAdminAccess && (
                  <>
                    <div className="border-t border-indigo-700 mt-4 pt-4">
                      <p className="px-2 text-xs font-semibold text-indigo-200 uppercase tracking-wide">
                        {t("nav.admin.title")}
                      </p>
                    </div>
                    {adminNavigation.map((item) => (
                      <NavLink key={item.name} item={item} />
                    ))}
                  </>
                )}
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Top navigation */}
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
          <button
            onClick={() => setSidebarOpen(true)}
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 md:hidden"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <div className="flex-1 px-4 flex justify-between">
            <div className="flex-1 flex"></div>
            <div className="ml-4 flex items-center md:ml-6 space-x-4">
              {/* Notifications */}
              <button
                onClick={() => setNotificationCenterOpen(true)}
                className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 relative"
              >
                <BellIcon className="h-6 w-6" />
                {notificationStats?.stats?.unread_count > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notificationStats.stats.unread_count > 9
                      ? "9+"
                      : notificationStats.stats.unread_count}
                  </span>
                )}
              </button>

              {/* Language Toggle */}
              <button
                onClick={toggleLanguage}
                className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <span className="text-sm font-medium">
                  {i18n.language === "en" ? "عر" : "EN"}
                </span>
              </button>

              {/* Profile dropdown */}
              <div className="relative">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                      <UserIcon className="h-5 w-5 text-gray-500" />
                    </div>
                  </div>
                  <div className="hidden md:block">
                    <div className="text-sm font-medium text-gray-700">
                      {user?.first_name} {user?.last_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {user?.roles?.join(", ")}
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    title={t("auth.logout")}
                  >
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      {/* Notification Center */}
      <NotificationCenter
        isOpen={notificationCenterOpen}
        onClose={() => setNotificationCenterOpen(false)}
      />
    </div>
  );
};

export default Layout;
