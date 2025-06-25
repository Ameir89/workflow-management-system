// src/routes/routeConfig.js - Updated Route configuration with Scripts
export const ROUTES = {
  // Public routes
  LOGIN: "/login",

  // Main navigation
  ROOT: "/",
  DASHBOARD: "/dashboard",

  // Workflow routes
  WORKFLOWS: {
    LIST: "/workflows/list",
    DESIGNER: "/workflows/designer",
    DESIGNER_EDIT: "/workflows/designer/:id",
    START_HUB: "/start-workflows",
    START_INSTANCE: "/workflows/:workflowId/start",
    INSTANCES: "/workflows/instances",
    WORKFLOW_INSTANCES: "/workflows/:workflowId/instances",
    INSTANCE_DETAIL: "/workflows/instances/:instanceId",
  },

  // Task routes
  TASKS: {
    LIST: "/tasks",
    DETAIL: "/tasks/:id",
    FORM: "/tasks/:taskId/form",
    START: "/tasks/start",
  },

  // Form routes
  FORMS: {
    LIST: "/forms",
    CREATE: "/forms/create",
    EDIT: "/forms/:id/edit",
    RESPONSES: "/forms/:id/responses",
  },

  // Scripts routes
  SCRIPTS: {
    LIST: "/scripts",
    CREATE: "/scripts/create",
    EDIT: "/scripts/:id/edit",
    VIEW: "/scripts/:id",
    HISTORY: "/scripts/:id/history",
    TEMPLATES: "/scripts/templates",
    ANALYTICS: "/scripts/analytics",
  },

  // Notification routes
  NOTIFICATIONS: {
    MANAGEMENT: "/admin/notifications",
    TEMPLATES: {
      CREATE: "/admin/notifications/templates/create",
      VIEW: "/admin/notifications/templates/:id",
      EDIT: "/admin/notifications/templates/:id/edit",
    },
  },

  // Webhook routes
  WEBHOOKS: {
    LIST: "/webhooks",
    CREATE: "/webhooks/create",
    EDIT: "/webhooks/:id/edit",
    DELIVERIES: "/webhooks/:id/deliveries",
  },

  // File management
  FILES: "/files",

  // Admin routes
  ADMIN: {
    USERS: "/admin/users",
    ROLES: "/admin/roles",
    HEALTH: "/admin/health",
    AUDIT_LOGS: "/admin/audit-logs",
    LOOKUPS: "/admin/lookups",
  },

  // Other routes
  REPORTS: "/reports",
  PROFILE: "/profile",
};

// Permission groups for different route categories
export const PERMISSIONS = {
  WORKFLOW_MANAGEMENT: ["create_workflows", "manage_workflows"],
  WORKFLOW_DESIGN: ["manage_workflows"],
  WORKFLOW_EXECUTION: ["start_workflow_instances"],
  WORKFLOW_MONITORING: ["view_workflow_instances"],

  FORM_MANAGEMENT: ["create_forms", "manage_forms"],
  FORM_RESPONSES: ["view_form_responses"],

  SCRIPT_MANAGEMENT: ["view_scripts", "create_scripts", "manage_scripts"],
  SCRIPT_EXECUTION: ["execute_scripts"],
  SCRIPT_TEMPLATES: ["view_script_templates", "manage_script_templates"],
  SCRIPT_ANALYTICS: ["view_script_analytics"],

  NOTIFICATION_MANAGEMENT: [
    "view_notifications",
    "manage_notification_templates",
  ],
  NOTIFICATION_TEMPLATES: [
    "view_notification_templates",
    "manage_notification_templates",
  ],

  WEBHOOK_MANAGEMENT: ["view_webhooks", "manage_webhooks"],

  USER_MANAGEMENT: ["manage_users"],
  ROLE_MANAGEMENT: ["manage_roles", "manage_users"],
  SYSTEM_ADMIN: ["view_system_health", "view_audit_logs", "manage_lookups"],

  REPORTS: ["view_reports"],
};

// Route metadata for dynamic menu generation
export const ROUTE_METADATA = {
  [ROUTES.DASHBOARD]: {
    title: "Dashboard",
    icon: "HomeIcon",
    showInNav: true,
    order: 1,
  },
  [ROUTES.WORKFLOWS.START_HUB]: {
    title: "Start Workflows",
    icon: "RocketLaunchIcon",
    showInNav: true,
    order: 2,
    permissions: PERMISSIONS.WORKFLOW_EXECUTION,
  },
  [ROUTES.TASKS.LIST]: {
    title: "Tasks",
    icon: "ClipboardDocumentListIcon",
    showInNav: true,
    order: 3,
  },
  [ROUTES.WORKFLOWS.INSTANCES]: {
    title: "Workflow Instances",
    icon: "RocketLaunchIcon",
    showInNav: true,
    order: 4,
    permissions: PERMISSIONS.WORKFLOW_MONITORING,
  },
  [ROUTES.REPORTS]: {
    title: "Reports",
    icon: "ChartBarIcon",
    showInNav: true,
    order: 5,
    permissions: PERMISSIONS.REPORTS,
  },

  // Configuration section
  [ROUTES.WORKFLOWS.LIST]: {
    title: "Manage Workflows",
    icon: "Cog8ToothIcon",
    showInNav: true,
    section: "configuration",
    order: 1,
    permissions: PERMISSIONS.WORKFLOW_MANAGEMENT,
  },
  [ROUTES.FORMS.LIST]: {
    title: "Forms",
    icon: "DocumentTextIcon",
    showInNav: true,
    section: "configuration",
    order: 2,
  },
  [ROUTES.SCRIPTS.LIST]: {
    title: "Scripts",
    icon: "CodeBracketIcon",
    showInNav: true,
    section: "configuration",
    order: 3,
    permissions: PERMISSIONS.SCRIPT_MANAGEMENT,
    children: [
      {
        title: "Manage Scripts",
        route: ROUTES.SCRIPTS.LIST,
        icon: "ListBulletIcon",
        permissions: PERMISSIONS.SCRIPT_MANAGEMENT,
      },
      {
        title: "Script Templates",
        route: ROUTES.SCRIPTS.TEMPLATES,
        icon: "BookOpenIcon",
        permissions: PERMISSIONS.SCRIPT_TEMPLATES,
      },
      {
        title: "Analytics",
        route: ROUTES.SCRIPTS.ANALYTICS,
        icon: "ChartBarIcon",
        permissions: PERMISSIONS.SCRIPT_ANALYTICS,
      },
    ],
  },
  [ROUTES.NOTIFICATIONS.MANAGEMENT]: {
    title: "Notifications",
    icon: "BellIcon",
    showInNav: true,
    section: "configuration",
    order: 4,
    permissions: PERMISSIONS.NOTIFICATION_MANAGEMENT,
  },
  [ROUTES.FILES]: {
    title: "Files",
    icon: "FolderIcon",
    showInNav: true,
    section: "configuration",
    order: 5,
  },
  [ROUTES.WEBHOOKS.LIST]: {
    title: "Webhooks",
    icon: "LinkIcon",
    showInNav: true,
    section: "configuration",
    order: 6,
    permissions: PERMISSIONS.WEBHOOK_MANAGEMENT,
  },
  [ROUTES.ADMIN.LOOKUPS]: {
    title: "Lookups Management",
    icon: "TableCellsIcon",
    showInNav: true,
    section: "configuration",
    order: 7,
    permissions: PERMISSIONS.SYSTEM_ADMIN,
  },

  // Admin section
  [ROUTES.ADMIN.USERS]: {
    title: "Users",
    icon: "UserGroupIcon",
    showInNav: true,
    section: "admin",
    order: 1,
    permissions: PERMISSIONS.USER_MANAGEMENT,
  },
  [ROUTES.ADMIN.ROLES]: {
    title: "Roles & Permissions",
    icon: "KeyIcon",
    showInNav: true,
    section: "admin",
    order: 2,
    permissions: PERMISSIONS.ROLE_MANAGEMENT,
  },
  [ROUTES.ADMIN.HEALTH]: {
    title: "System Health",
    icon: "ShieldCheckIcon",
    showInNav: true,
    section: "admin",
    order: 3,
    permissions: PERMISSIONS.SYSTEM_ADMIN,
  },
  [ROUTES.ADMIN.AUDIT_LOGS]: {
    title: "Audit Logs",
    icon: "PencilSquareIcon",
    showInNav: true,
    section: "admin",
    order: 4,
    permissions: PERMISSIONS.SYSTEM_ADMIN,
  },

  // Script-specific routes (not shown in main nav)
  [ROUTES.SCRIPTS.CREATE]: {
    title: "Create Script",
    icon: "PlusIcon",
    showInNav: false,
    permissions: PERMISSIONS.SCRIPT_MANAGEMENT,
  },
  [ROUTES.SCRIPTS.EDIT]: {
    title: "Edit Script",
    icon: "PencilIcon",
    showInNav: false,
    permissions: PERMISSIONS.SCRIPT_MANAGEMENT,
  },
  [ROUTES.SCRIPTS.VIEW]: {
    title: "View Script",
    icon: "EyeIcon",
    showInNav: false,
    permissions: PERMISSIONS.SCRIPT_MANAGEMENT,
  },
  [ROUTES.SCRIPTS.HISTORY]: {
    title: "Script History",
    icon: "ClockIcon",
    showInNav: false,
    permissions: PERMISSIONS.SCRIPT_MANAGEMENT,
  },
  [ROUTES.SCRIPTS.TEMPLATES]: {
    title: "Script Templates",
    icon: "BookOpenIcon",
    showInNav: false,
    permissions: PERMISSIONS.SCRIPT_TEMPLATES,
  },
  [ROUTES.SCRIPTS.ANALYTICS]: {
    title: "Script Analytics",
    icon: "ChartBarIcon",
    showInNav: false,
    permissions: PERMISSIONS.SCRIPT_ANALYTICS,
  },
};

// Script-specific route helpers
export const scriptRouteHelpers = {
  /**
   * Generate script route with ID parameter
   */
  getScriptRoute: (scriptId, action = "view") => {
    const routes = {
      view: ROUTES.SCRIPTS.VIEW,
      edit: ROUTES.SCRIPTS.EDIT,
      history: ROUTES.SCRIPTS.HISTORY,
    };
    return routes[action]?.replace(":id", scriptId) || ROUTES.SCRIPTS.LIST;
  },

  /**
   * Get script breadcrumb
   */
  getScriptBreadcrumb: (scriptId, scriptName, currentPage = "view") => {
    const breadcrumbs = [{ title: "Scripts", path: ROUTES.SCRIPTS.LIST }];

    if (scriptId && scriptName) {
      breadcrumbs.push({
        title: scriptName,
        path: scriptRouteHelpers.getScriptRoute(scriptId, "view"),
      });

      if (currentPage !== "view") {
        const pageNames = {
          edit: "Edit",
          history: "Execution History",
          create: "Create",
        };
        breadcrumbs.push({
          title: pageNames[currentPage] || currentPage,
          path: null, // Current page
        });
      }
    } else if (currentPage === "create") {
      breadcrumbs.push({
        title: "Create Script",
        path: null,
      });
    }

    return breadcrumbs;
  },

  /**
   * Check if current route is a script route
   */
  isScriptRoute: (pathname) => {
    return pathname.startsWith("/scripts");
  },

  /**
   * Get script navigation items for user
   */
  getScriptNavigation: (userPermissions = []) => {
    const navItems = [];

    if (routeHelpers.hasRoutePermission(ROUTES.SCRIPTS.LIST, userPermissions)) {
      navItems.push({
        title: "All Scripts",
        route: ROUTES.SCRIPTS.LIST,
        icon: "ListBulletIcon",
      });
    }

    if (
      routeHelpers.hasRoutePermission(ROUTES.SCRIPTS.TEMPLATES, userPermissions)
    ) {
      navItems.push({
        title: "Templates",
        route: ROUTES.SCRIPTS.TEMPLATES,
        icon: "BookOpenIcon",
      });
    }

    if (
      routeHelpers.hasRoutePermission(ROUTES.SCRIPTS.ANALYTICS, userPermissions)
    ) {
      navItems.push({
        title: "Analytics",
        route: ROUTES.SCRIPTS.ANALYTICS,
        icon: "ChartBarIcon",
      });
    }

    if (
      routeHelpers.hasRoutePermission(ROUTES.SCRIPTS.CREATE, userPermissions)
    ) {
      navItems.push({
        title: "Create Script",
        route: ROUTES.SCRIPTS.CREATE,
        icon: "PlusIcon",
        primary: true,
      });
    }

    return navItems;
  },
};

// Helper functions for route management (existing + updated)
export const routeHelpers = {
  /**
   * Generate route path with parameters
   */
  generatePath: (route, params = {}) => {
    let path = route;
    Object.keys(params).forEach((key) => {
      path = path.replace(`:${key}`, params[key]);
    });
    return path;
  },

  /**
   * Check if user has permission for route
   */
  hasRoutePermission: (route, userPermissions = []) => {
    const metadata = ROUTE_METADATA[route];
    if (!metadata?.permissions) return true;

    return (
      userPermissions.includes("*") ||
      metadata.permissions.some((permission) =>
        userPermissions.includes(permission)
      )
    );
  },

  /**
   * Get navigation items for user
   */
  getNavigationItems: (userPermissions = []) => {
    return Object.entries(ROUTE_METADATA)
      .filter(
        ([route, metadata]) =>
          metadata.showInNav &&
          routeHelpers.hasRoutePermission(route, userPermissions)
      )
      .sort((a, b) => (a[1].order || 999) - (b[1].order || 999))
      .reduce((acc, [route, metadata]) => {
        const section = metadata.section || "main";
        if (!acc[section]) acc[section] = [];
        acc[section].push({ route, ...metadata });
        return acc;
      }, {});
  },

  /**
   * Get breadcrumb for current route
   */
  getBreadcrumb: (pathname, params = {}) => {
    // Handle script routes specifically
    if (scriptRouteHelpers.isScriptRoute(pathname)) {
      const pathSegments = pathname.split("/").filter(Boolean);

      if (pathSegments.length >= 2) {
        const scriptId = pathSegments[1];
        const action = pathSegments[2] || "view";

        // If we have script details, use them
        if (params.scriptName) {
          return scriptRouteHelpers.getScriptBreadcrumb(
            scriptId,
            params.scriptName,
            action
          );
        }
      }

      // Special routes
      if (pathname === ROUTES.SCRIPTS.TEMPLATES) {
        return [
          { title: "Scripts", path: ROUTES.SCRIPTS.LIST },
          { title: "Templates", path: null },
        ];
      }

      if (pathname === ROUTES.SCRIPTS.ANALYTICS) {
        return [
          { title: "Scripts", path: ROUTES.SCRIPTS.LIST },
          { title: "Analytics", path: null },
        ];
      }

      if (pathname === ROUTES.SCRIPTS.CREATE) {
        return [
          { title: "Scripts", path: ROUTES.SCRIPTS.LIST },
          { title: "Create Script", path: null },
        ];
      }
    }

    // Simple breadcrumb generation for other routes
    const segments = pathname.split("/").filter(Boolean);
    return segments.map((segment, index) => {
      const path = "/" + segments.slice(0, index + 1).join("/");
      const metadata = ROUTE_METADATA[path];
      return {
        path,
        title:
          metadata?.title || segment.charAt(0).toUpperCase() + segment.slice(1),
        isLast: index === segments.length - 1,
      };
    });
  },

  /**
   * Get active route for navigation highlighting
   */
  getActiveRoute: (pathname) => {
    // Handle script routes
    if (scriptRouteHelpers.isScriptRoute(pathname)) {
      if (pathname.includes("/templates")) return ROUTES.SCRIPTS.TEMPLATES;
      if (pathname.includes("/analytics")) return ROUTES.SCRIPTS.ANALYTICS;
      return ROUTES.SCRIPTS.LIST;
    }

    // Find exact match first
    const exactMatch = Object.values(ROUTES).find((route) => {
      if (typeof route === "string") {
        return route === pathname;
      }
      if (typeof route === "object") {
        return Object.values(route).includes(pathname);
      }
      return false;
    });

    if (exactMatch) return exactMatch;

    // Find partial match for dynamic routes
    return Object.values(ROUTES).find((route) => {
      if (typeof route === "string") {
        const routePattern = route.replace(/:[^/]+/g, "[^/]+");
        const regex = new RegExp(`^${routePattern}$`);
        return regex.test(pathname);
      }
      if (typeof route === "object") {
        return Object.values(route).some((subRoute) => {
          const routePattern = subRoute.replace(/:[^/]+/g, "[^/]+");
          const regex = new RegExp(`^${routePattern}$`);
          return regex.test(pathname);
        });
      }
      return false;
    });
  },
};
