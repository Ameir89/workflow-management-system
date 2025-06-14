import React, { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import { useAuth } from "../../hooks/useAuth";
import { notificationsService } from "../../services/notificationsService";
import NotificationCenter from "../Notifications/NotificationCenter";
import Sidebar from "./Sidebar";
import {
  BellIcon,
  Bars3Icon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

const Layout = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const { data: notificationStats } = useQuery(
    "notification-stats",
    () => notificationsService.getNotificationStats(),
    { refetchInterval: 30000 }
  );

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === "en" ? "ar" : "en";
    i18n.changeLanguage(newLang);
    document.dir = newLang === "ar" ? "rtl" : "ltr";
  };

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userPermissions={user?.permissions || []}
      />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden lg:pl-72">
        {/* Top navigation bar */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-200"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>

            {/* Page title or breadcrumb could go here */}
            <div className="flex-1 lg:flex lg:items-center lg:justify-between">
              <div className="hidden lg:block">
                {/* You can add breadcrumbs or page title here */}
              </div>
            </div>

            {/* Right side actions */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button
                onClick={() => setNotificationCenterOpen(true)}
                className="relative p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                <BellIcon className="h-6 w-6" />
                {notificationStats?.stats?.unread_count > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium animate-pulse">
                    {notificationStats.stats.unread_count > 9
                      ? "9+"
                      : notificationStats.stats.unread_count}
                  </span>
                )}
              </button>

              {/* Language Toggle */}
              <button
                onClick={toggleLanguage}
                className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <span className="text-sm font-medium">
                  {i18n.language === "en" ? "عر" : "EN"}
                </span>
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-3 p-2 text-sm rounded-lg hover:bg-gray-100 transition-colors duration-200"
                >
                  <div className="flex items-center space-x-3">
                    {/* Avatar */}
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                      {user?.first_name ? (
                        <span className="text-sm font-medium text-white">
                          {user.first_name.charAt(0).toUpperCase()}
                          {user.last_name?.charAt(0).toUpperCase()}
                        </span>
                      ) : (
                        <UserIcon className="h-5 w-5 text-white" />
                      )}
                    </div>

                    {/* User info - hidden on mobile */}
                    <div className="hidden md:block text-left">
                      <div className="text-sm font-medium text-gray-900">
                        {user?.first_name} {user?.last_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {user?.roles?.join(", ")}
                      </div>
                    </div>

                    <ChevronDownIcon
                      className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
                        userMenuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </button>

                {/* User dropdown menu */}
                {userMenuOpen && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />

                    {/* Dropdown */}
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-20">
                      <div className="py-1">
                        {/* User info on mobile */}
                        <div className="md:hidden px-4 py-3 border-b border-gray-100">
                          <div className="text-sm font-medium text-gray-900">
                            {user?.first_name} {user?.last_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {user?.email}
                          </div>
                        </div>

                        {/* Menu items */}
                        <button
                          onClick={() => {
                            navigate("/profile");
                            setUserMenuOpen(false);
                          }}
                          className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                        >
                          <UserIcon className="mr-3 h-4 w-4 text-gray-500" />
                          {t("nav.profile")}
                        </button>

                        <button
                          onClick={() => {
                            handleLogout();
                            setUserMenuOpen(false);
                          }}
                          className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                        >
                          <ArrowRightOnRectangleIcon className="mr-3 h-4 w-4 text-gray-500" />
                          {t("auth.logout")}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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
