// src/mocks/permissions.js - Mock data for development/testing

export const mockPermissions = [
  // Workflow Management Permissions
  "workflow_create",
  "workflow_read",
  "workflow_update",
  "workflow_delete",
  "workflow_execute",
  "workflow_manage_instances",
  "workflow_view_instances",
  "workflow_pause_instances",
  "workflow_cancel_instances",

  // Task Management Permissions
  "task_create",
  "task_read",
  "task_update",
  "task_delete",
  "task_assign",
  "task_complete",
  "task_view_all",
  "task_manage_assignments",

  // Form Management Permissions
  "form_create",
  "form_read",
  "form_update",
  "form_delete",
  "form_submit",
  "form_view_responses",
  "form_export_responses",
  "form_manage_templates",

  // User Management Permissions
  "user_create",
  "user_read",
  "user_update",
  "user_delete",
  "user_manage_roles",
  "user_reset_password",
  "user_manage_sessions",
  "manage_users", // Legacy permission

  // Admin Permissions
  "admin_system_config",
  "admin_view_logs",
  "admin_manage_backups",
  "admin_security_settings",
  "admin_integrations",
  "admin_maintenance",
  "view_audit_logs", // Legacy permission
  "manage_system", // Legacy permission

  // Webhook Permissions
  "webhook_create",
  "webhook_read",
  "webhook_update",
  "webhook_delete",
  "webhook_test",
  "webhook_view_deliveries",

  // File Management Permissions
  "file_upload",
  "file_download",
  "file_delete",
  "file_manage",
  "file_view_all",

  // Report & Analytics Permissions
  "report_view",
  "report_create",
  "report_export",
  "report_advanced_analytics",
  "view_reports", // Legacy permission

  // System Permissions
  "system_health_view",
  "system_metrics_view",
  "api_key_manage",
  "lookup_tables_manage",
  "email_templates_manage",
  "notification_manage",
];

export const mockRoles = [
  {
    id: 1,
    name: "Super Admin",
    description: "Full system access with all permissions",
    permissions: mockPermissions, // All permissions
    is_system: true,
    is_active: true,
    user_count: 2,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    name: "Workflow Manager",
    description: "Can create and manage workflows and instances",
    permissions: [
      "workflow_create",
      "workflow_read",
      "workflow_update",
      "workflow_delete",
      "workflow_execute",
      "workflow_manage_instances",
      "workflow_view_instances",
      "workflow_pause_instances",
      "workflow_cancel_instances",
      "task_view_all",
      "task_assign",
      "form_read",
      "form_view_responses",
      "user_read",
    ],
    is_system: false,
    is_active: true,
    user_count: 5,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 3,
    name: "Task Executor",
    description: "Can execute tasks and complete assignments",
    permissions: [
      "task_read",
      "task_update",
      "task_complete",
      "form_submit",
      "form_read",
      "file_upload",
      "file_download",
      "workflow_view_instances",
    ],
    is_system: false,
    is_active: true,
    user_count: 15,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 4,
    name: "Form Designer",
    description: "Can create and manage forms and templates",
    permissions: [
      "form_create",
      "form_read",
      "form_update",
      "form_delete",
      "form_view_responses",
      "form_export_responses",
      "form_manage_templates",
      "file_upload",
      "file_manage",
    ],
    is_system: false,
    is_active: true,
    user_count: 3,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 5,
    name: "Report Viewer",
    description: "Can view reports and analytics",
    permissions: [
      "report_view",
      "report_export",
      "view_reports",
      "workflow_view_instances",
      "task_read",
      "form_view_responses",
    ],
    is_system: false,
    is_active: true,
    user_count: 8,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 6,
    name: "System Admin",
    description: "Administrative access to system configuration and monitoring",
    permissions: [
      "admin_system_config",
      "admin_view_logs",
      "admin_manage_backups",
      "admin_security_settings",
      "admin_maintenance",
      "view_audit_logs",
      "manage_system",
      "system_health_view",
      "system_metrics_view",
      "user_read",
      "user_manage_sessions",
      "api_key_manage",
    ],
    is_system: false,
    is_active: true,
    user_count: 2,
    created_at: "2024-01-01T00:00:00Z",
  },
];

export const mockUsers = [
  {
    id: 1,
    username: "admin",
    email: "admin@example.com",
    first_name: "System",
    last_name: "Administrator",
    phone: "+1234567890",
    roles: [{ id: 1, name: "Super Admin" }],
    is_active: true,
    is_verified: true,
    two_fa_enabled: true,
    last_login: "2024-06-15T10:30:00Z",
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    username: "wf_manager",
    email: "workflow.manager@example.com",
    first_name: "John",
    last_name: "Manager",
    phone: "+1234567891",
    roles: [
      { id: 2, name: "Workflow Manager" },
      { id: 5, name: "Report Viewer" },
    ],
    is_active: true,
    is_verified: true,
    two_fa_enabled: false,
    last_login: "2024-06-14T15:45:00Z",
    created_at: "2024-01-15T00:00:00Z",
  },
  {
    id: 3,
    username: "task_user",
    email: "task.user@example.com",
    first_name: "Jane",
    last_name: "Worker",
    phone: "+1234567892",
    roles: [{ id: 3, name: "Task Executor" }],
    is_active: true,
    is_verified: true,
    two_fa_enabled: false,
    last_login: "2024-06-16T09:15:00Z",
    created_at: "2024-02-01T00:00:00Z",
  },
  {
    id: 4,
    username: "form_designer",
    email: "forms@example.com",
    first_name: "Alice",
    last_name: "Designer",
    phone: "+1234567893",
    roles: [
      { id: 4, name: "Form Designer" },
      { id: 5, name: "Report Viewer" },
    ],
    is_active: true,
    is_verified: false,
    two_fa_enabled: false,
    last_login: "2024-06-13T14:20:00Z",
    created_at: "2024-02-15T00:00:00Z",
  },
  {
    id: 5,
    username: "sys_admin",
    email: "sysadmin@example.com",
    first_name: "Bob",
    last_name: "Administrator",
    phone: "+1234567894",
    roles: [
      { id: 6, name: "System Admin" },
      { id: 5, name: "Report Viewer" },
    ],
    is_active: true,
    is_verified: true,
    two_fa_enabled: true,
    last_login: "2024-06-15T16:00:00Z",
    created_at: "2024-01-20T00:00:00Z",
  },
];

// Helper function to simulate API responses
export const getFormattedRolesResponse = () => ({
  roles: mockRoles,
  summary: {
    total: mockRoles.length,
    active: mockRoles.filter((r) => r.is_active).length,
    system: mockRoles.filter((r) => r.is_system).length,
  },
  pagination: {
    page: 1,
    pages: 1,
    total: mockRoles.length,
    limit: 20,
  },
});

export const getFormattedUsersResponse = () => ({
  users: mockUsers,
  summary: {
    total: mockUsers.length,
    active: mockUsers.filter((u) => u.is_active).length,
    verified: mockUsers.filter((u) => u.is_verified).length,
    with_2fa: mockUsers.filter((u) => u.two_fa_enabled).length,
  },
  pagination: {
    page: 1,
    pages: 1,
    total: mockUsers.length,
    limit: 20,
  },
});

export const getFormattedPermissionsResponse = () => ({
  permissions: mockPermissions,
  categories: {
    workflow: mockPermissions.filter((p) => p.startsWith("workflow_")),
    task: mockPermissions.filter((p) => p.startsWith("task_")),
    form: mockPermissions.filter((p) => p.startsWith("form_")),
    user: mockPermissions.filter(
      (p) => p.startsWith("user_") || p === "manage_users"
    ),
    admin: mockPermissions.filter(
      (p) =>
        p.startsWith("admin_") ||
        p === "view_audit_logs" ||
        p === "manage_system"
    ),
    webhook: mockPermissions.filter((p) => p.startsWith("webhook_")),
    file: mockPermissions.filter((p) => p.startsWith("file_")),
    report: mockPermissions.filter(
      (p) => p.startsWith("report_") || p === "view_reports"
    ),
    system: mockPermissions.filter(
      (p) =>
        p.startsWith("system_") ||
        p === "api_key_manage" ||
        p === "lookup_tables_manage" ||
        p === "email_templates_manage" ||
        p === "notification_manage"
    ),
  },
});
