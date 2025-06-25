import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { notificationManagementService } from "../../services/notificationManagementService";
import {
  BellIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  DocumentTextIcon,
  CogIcon,
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  PlayIcon,
  PauseIcon,
  ChartBarIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
} from "@heroicons/react/24/outline";
import {
  BellIcon as BellIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
} from "@heroicons/react/24/solid";

const NotificationManagement = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("templates");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    status: "",
    type: "",
    category: "",
  });
  const [page, setPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState([]);

  // Fetch notification templates
  const { data: templatesData, isLoading: templatesLoading } = useQuery(
    ["notification-templates", page, search, filters],
    () =>
      notificationManagementService.getTemplates({
        page,
        limit: 20,
        search,
        ...filters,
      }),
    { keepPreviousData: true }
  );

  // Fetch notification history
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

  // Fetch notification settings
  const { data: settingsData } = useQuery(
    ["notification-settings"],
    () => notificationManagementService.getSettings(),
    {
      enabled: activeTab === "settings",
    }
  );

  // Fetch analytics data
  const { data: analyticsData } = useQuery(
    ["notification-analytics"],
    () => notificationManagementService.getAnalytics(),
    {
      enabled: activeTab === "analytics",
      refetchInterval: 60000, // Refresh every minute
    }
  );

  // Delete template mutation
  const deleteTemplateMutation = useMutation(
    (id) => notificationManagementService.deleteTemplate(id),
    {
      onSuccess: () => {
        toast.success("Template deleted successfully");
        queryClient.invalidateQueries(["notification-templates"]);
        setSelectedItems([]);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );

  // Toggle template status mutation
  const toggleTemplateMutation = useMutation(
    ({ id, isActive }) =>
      notificationManagementService.updateTemplate(id, {
        is_active: !isActive,
      }),
    {
      onSuccess: () => {
        toast.success("Template status updated");
        queryClient.invalidateQueries(["notification-templates"]);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );

  // Test template mutation
  const testTemplateMutation = useMutation(
    ({ id, testData }) =>
      notificationManagementService.testTemplate(id, testData),
    {
      onSuccess: () => {
        toast.success("Test notification sent successfully");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );

  // Bulk operations mutation
  const bulkOperationMutation = useMutation(
    ({ operation, ids }) =>
      notificationManagementService.bulkOperations(operation, ids),
    {
      onSuccess: (data, { operation }) => {
        toast.success(`Bulk ${operation} completed successfully`);
        queryClient.invalidateQueries(["notification-templates"]);
        setSelectedItems([]);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }
  );

  const handleDeleteTemplate = (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteTemplateMutation.mutate(id);
    }
  };

  const handleToggleTemplate = (template) => {
    toggleTemplateMutation.mutate({
      id: template.id,
      isActive: template.is_active,
    });
  };

  const handleTestTemplate = (template) => {
    const testData = {
      recipient: "test@example.com",
      variables: {
        user_name: "Test User",
        task_name: "Sample Task",
        workflow_name: "Sample Workflow",
      },
    };
    testTemplateMutation.mutate({ id: template.id, testData });
  };

  const handleBulkOperation = (operation) => {
    if (selectedItems.length === 0) {
      toast.warning("Please select items first");
      return;
    }

    if (
      window.confirm(
        `Are you sure you want to ${operation} ${selectedItems.length} items?`
      )
    ) {
      bulkOperationMutation.mutate({ operation, ids: selectedItems });
    }
  };

  const getChannelIcon = (channel) => {
    switch (channel) {
      case "email":
        return <EnvelopeIcon className="h-4 w-4" />;
      case "sms":
        return <DevicePhoneMobileIcon className="h-4 w-4" />;
      case "in_app":
        return <ComputerDesktopIcon className="h-4 w-4" />;
      default:
        return <BellIcon className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getDeliveryStatusColor = (status) => {
    switch (status) {
      case "delivered":
        return "text-green-600";
      case "failed":
        return "text-red-600";
      case "pending":
        return "text-yellow-600";
      default:
        return "text-gray-600";
    }
  };

  const getDeliveryStatusIcon = (status) => {
    switch (status) {
      case "delivered":
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircleIcon className="h-4 w-4 text-red-500" />;
      case "pending":
        return <ClockIcon className="h-4 w-4 text-yellow-500" />;
      default:
        return <ExclamationTriangleIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const tabs = [
    {
      id: "templates",
      name: "Templates",
      icon: DocumentTextIcon,
      count: templatesData?.pagination?.total,
    },
    {
      id: "history",
      name: "History",
      icon: ClockIcon,
      count: historyData?.pagination?.total,
    },
    {
      id: "analytics",
      name: "Analytics",
      icon: ChartBarIcon,
    },
    {
      id: "settings",
      name: "Settings",
      icon: CogIcon,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <BellIconSolid className="h-8 w-8 text-indigo-600 mr-3" />
            Notification Management
          </h1>
          <p className="text-gray-600">
            Manage notification templates, settings, and delivery history
          </p>
        </div>
        <div className="flex space-x-3">
          {activeTab === "templates" && (
            <>
              {selectedItems.length > 0 && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleBulkOperation("activate")}
                    className="btn btn-outline btn-sm"
                  >
                    <PlayIcon className="h-4 w-4 mr-2" />
                    Activate ({selectedItems.length})
                  </button>
                  <button
                    onClick={() => handleBulkOperation("deactivate")}
                    className="btn btn-outline btn-sm"
                  >
                    <PauseIcon className="h-4 w-4 mr-2" />
                    Deactivate ({selectedItems.length})
                  </button>
                  <button
                    onClick={() => handleBulkOperation("delete")}
                    className="btn btn-danger btn-sm"
                  >
                    <TrashIcon className="h-4 w-4 mr-2" />
                    Delete ({selectedItems.length})
                  </button>
                </div>
              )}
              <Link to="templates/create" className="btn btn-primary">
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Template
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      {analyticsData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <DocumentTextIconSolid className="h-8 w-8 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">
                  Active Templates
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {analyticsData.stats?.active_templates || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <BellIconSolid className="h-8 w-8 text-green-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Sent Today</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {analyticsData.stats?.sent_today || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-green-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">
                  Delivery Rate
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {analyticsData.stats?.delivery_rate || 0}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <XCircleIcon className="h-8 w-8 text-red-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">
                  Failed Today
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {analyticsData.stats?.failed_today || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setPage(1);
                  setSelectedItems([]);
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.name}</span>
                {tab.count !== undefined && (
                  <span className="bg-gray-100 text-gray-900 text-xs rounded-full px-2 py-0.5">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Templates Tab */}
          {activeTab === "templates" && (
            <div className="space-y-6">
              {/* Search and Filters */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <div className="flex-1 max-w-lg">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search templates..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <select
                    value={filters.status}
                    onChange={(e) =>
                      setFilters({ ...filters, status: e.target.value })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="draft">Draft</option>
                  </select>

                  <select
                    value={filters.type}
                    onChange={(e) =>
                      setFilters({ ...filters, type: e.target.value })
                    }
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">All Types</option>
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="in_app">In-App</option>
                  </select>

                  <button
                    onClick={() => {
                      setSearch("");
                      setFilters({ status: "", type: "", category: "" });
                    }}
                    className="btn btn-outline btn-sm"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>

              {/* Templates List */}
              {templatesLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : templatesData?.templates?.length > 0 ? (
                <div className="space-y-4">
                  {templatesData.templates.map((template) => (
                    <div
                      key={template.id}
                      className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(template.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedItems([
                                  ...selectedItems,
                                  template.id,
                                ]);
                              } else {
                                setSelectedItems(
                                  selectedItems.filter(
                                    (id) => id !== template.id
                                  )
                                );
                              }
                            }}
                            className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <h3 className="text-lg font-medium text-gray-900">
                                {template.name}
                              </h3>
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                  template.is_active ? "active" : "inactive"
                                )}`}
                              >
                                {template.is_active ? "Active" : "Inactive"}
                              </span>
                              <div className="flex items-center space-x-1">
                                {getChannelIcon(template.channel)}
                                <span className="text-sm text-gray-500 capitalize">
                                  {template.channel}
                                </span>
                              </div>
                            </div>
                            <p className="text-gray-600 mt-1">
                              {template.description}
                            </p>
                            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                              <span>Category: {template.category}</span>
                              <span>•</span>
                              <span>
                                Used {template.usage_count || 0} times
                              </span>
                              <span>•</span>
                              <span>
                                Modified{" "}
                                {new Date(
                                  template.updated_at
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleTestTemplate(template)}
                            className="text-blue-400 hover:text-blue-600"
                            title="Test template"
                          >
                            <PlayIcon className="h-5 w-5" />
                          </button>

                          <Link
                            to={`templates/${template.id}`}
                            className="text-gray-400 hover:text-gray-600"
                            title="View template"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </Link>

                          <Link
                            to={`templates/${template.id}/edit`}
                            className="text-indigo-400 hover:text-indigo-600"
                            title="Edit template"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </Link>

                          <button
                            onClick={() => handleToggleTemplate(template)}
                            className={`${
                              template.is_active
                                ? "text-orange-400 hover:text-orange-600"
                                : "text-green-400 hover:text-green-600"
                            }`}
                            title={
                              template.is_active
                                ? "Deactivate template"
                                : "Activate template"
                            }
                          >
                            {template.is_active ? (
                              <PauseIcon className="h-5 w-5" />
                            ) : (
                              <PlayIcon className="h-5 w-5" />
                            )}
                          </button>

                          <button
                            onClick={() =>
                              handleDeleteTemplate(template.id, template.name)
                            }
                            className="text-red-400 hover:text-red-600"
                            title="Delete template"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No templates found
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by creating your first notification template.
                  </p>
                  <div className="mt-6">
                    <Link to="templates/create" className="btn btn-primary">
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Create Template
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="flex items-center space-x-4">
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Status</option>
                  <option value="delivered">Delivered</option>
                  <option value="failed">Failed</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              {/* History List */}
              {historyLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : historyData?.notifications?.length > 0 ? (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                  <ul className="divide-y divide-gray-200">
                    {historyData.notifications.map((notification) => (
                      <li key={notification.id} className="px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            {getDeliveryStatusIcon(notification.status)}
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {notification.subject || notification.title}
                              </p>
                              <p className="text-sm text-gray-500">
                                To: {notification.recipient}
                              </p>
                              <p className="text-sm text-gray-500">
                                Template: {notification.template_name}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p
                              className={`text-sm font-medium ${getDeliveryStatusColor(
                                notification.status
                              )}`}
                            >
                              {notification.status}
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(notification.sent_at).toLocaleString()}
                            </p>
                            <div className="flex items-center space-x-1 mt-1">
                              {getChannelIcon(notification.channel)}
                              <span className="text-xs text-gray-500 capitalize">
                                {notification.channel}
                              </span>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-center py-12">
                  <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No notification history
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Notification delivery history will appear here.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">
                Notification Analytics
              </h3>
              <p className="text-gray-600">
                Analytics dashboard coming soon...
              </p>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">
                Notification Settings
              </h3>
              <p className="text-gray-600">
                Global notification settings coming soon...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {((activeTab === "templates" && templatesData?.pagination) ||
        (activeTab === "history" && historyData?.pagination)) && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setPage(
                  Math.min(
                    (activeTab === "templates"
                      ? templatesData?.pagination?.pages
                      : historyData?.pagination?.pages) || 1,
                    page + 1
                  )
                )
              }
              disabled={
                page ===
                (activeTab === "templates"
                  ? templatesData?.pagination?.pages
                  : historyData?.pagination?.pages)
              }
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationManagement;
