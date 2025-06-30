// src/components/Admin/RolesManagement/utils/permissionsUtils.js

/**
 * Format permission name for display
 * @param {string} permission - Raw permission string
 * @returns {string} Formatted permission name
 */
export const formatPermissionName = (permission) => {
  if (!permission) return "";

  return permission
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

/**
 * Group permissions by category
 * @param {Object} permissions - Permissions object from API
 * @returns {Array} Array of [groupKey, groupData] tuples
 */
export const groupPermissions = (permissions) => {
  if (!permissions) return [];

  // If permissions is an array (flat list), create default groups
  if (Array.isArray(permissions)) {
    return createDefaultGroups(permissions);
  }

  // If permissions is an object with categories
  if (typeof permissions === "object") {
    return Object.entries(permissions)
      .filter(([_, group]) => group.permissions && group.permissions.length > 0)
      .map(([key, group]) => [
        key,
        {
          name: group.name || formatGroupName(key),
          permissions: group.permissions || [],
        },
      ]);
  }

  return [];
};

/**
 * Create default permission groups from flat array
 * @param {Array} permissionsList - Flat array of permissions
 * @returns {Array} Array of [groupKey, groupData] tuples
 */
const createDefaultGroups = (permissionsList) => {
  const groups = {
    workflow_management: {
      name: "Workflow Management",
      permissions: [],
    },
    task_management: {
      name: "Task Management",
      permissions: [],
    },
    form_management: {
      name: "Forms Management",
      permissions: [],
    },
    user_management: {
      name: "User Management",
      permissions: [],
    },
    system_administration: {
      name: "System Administration",
      permissions: [],
    },
    reporting: {
      name: "Reporting & Analytics",
      permissions: [],
    },
    role_management: {
      name: "Role Management",
      permissions: [],
    },
    sla_management: {
      name: "SLA Management",
      permissions: [],
    },
    lookup_management: {
      name: "Lookup Management",
      permissions: [],
    },
    file_management: {
      name: "File Management",
      permissions: [],
    },
    automation: {
      name: "Automation Management",
      permissions: [],
    },
    other: {
      name: "Other Permissions",
      permissions: [],
    },
  };

  // Categorize permissions based on prefixes
  permissionsList.forEach((permission) => {
    if (permission.startsWith("workflow_")) {
      groups.workflow_management.permissions.push(permission);
    } else if (permission.startsWith("task_")) {
      groups.task_management.permissions.push(permission);
    } else if (permission.startsWith("form_")) {
      groups.form_management.permissions.push(permission);
    } else if (
      permission.startsWith("user_") ||
      permission === "manage_users"
    ) {
      groups.user_management.permissions.push(permission);
    } else if (
      permission.startsWith("admin_") ||
      permission === "view_audit_logs" ||
      permission === "manage_system"
    ) {
      groups.system_administration.permissions.push(permission);
    } else if (
      permission.startsWith("report_") ||
      permission === "view_reports"
    ) {
      groups.reporting.permissions.push(permission);
    } else if (permission.includes("role")) {
      groups.role_management.permissions.push(permission);
    } else {
      groups.other.permissions.push(permission);
    }
  });

  // Return only groups that have permissions
  return Object.entries(groups).filter(
    ([_, group]) => group.permissions.length > 0
  );
};

/**
 * Format group name for display
 * @param {string} groupKey - Raw group key
 * @returns {string} Formatted group name
 */
const formatGroupName = (groupKey) => {
  return groupKey
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

/**
 * Search permissions by query
 * @param {Array} permissions - List of permissions
 * @param {string} query - Search query
 * @returns {Array} Filtered permissions
 */
export const searchPermissions = (permissions, query) => {
  if (!query || !permissions) return permissions;

  const searchLower = query.toLowerCase();
  return permissions.filter(
    (permission) =>
      permission.toLowerCase().includes(searchLower) ||
      formatPermissionName(permission).toLowerCase().includes(searchLower)
  );
};

/**
 * Get permission description/tooltip
 * @param {string} permission - Permission string
 * @returns {string} Permission description
 */
export const getPermissionDescription = (permission) => {
  const descriptions = {
    // Workflow permissions
    workflow_create: "Create new workflows",
    workflow_read: "View existing workflows",
    workflow_update: "Edit workflow definitions",
    workflow_delete: "Delete workflows",
    workflow_execute: "Start workflow instances",

    // Task permissions
    task_create: "Create new tasks",
    task_read: "View task details",
    task_update: "Modify task properties",
    task_complete: "Mark tasks as completed",
    task_assign: "Assign tasks to users",

    // User permissions
    user_create: "Create new user accounts",
    user_read: "View user information",
    user_update: "Edit user profiles",
    user_delete: "Delete user accounts",
    manage_users: "Full user management access",

    // Admin permissions
    admin_system_config: "Configure system settings",
    admin_view_logs: "Access system logs",
    view_audit_logs: "View audit trail",
    manage_system: "System administration access",
  };

  return descriptions[permission] || formatPermissionName(permission);
};

/**
 * Validate permission selection
 * @param {Array} selectedPermissions - Selected permissions
 * @param {Array} allPermissions - All available permissions
 * @returns {Object} Validation result
 */
export const validatePermissionSelection = (
  selectedPermissions,
  allPermissions
) => {
  const errors = [];
  const warnings = [];

  if (!selectedPermissions || selectedPermissions.length === 0) {
    errors.push("At least one permission must be selected");
  }

  // Check for invalid permissions
  const invalidPermissions = selectedPermissions.filter(
    (permission) => !allPermissions.includes(permission)
  );

  if (invalidPermissions.length > 0) {
    errors.push(`Invalid permissions: ${invalidPermissions.join(", ")}`);
  }

  // Check for conflicting permissions
  const hasReadOnly = selectedPermissions.some((p) => p.includes("read"));
  const hasFullAccess = selectedPermissions.includes("manage_system");

  if (hasReadOnly && hasFullAccess) {
    warnings.push(
      "Full system access permission makes read-only permissions redundant"
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Get permission dependencies
 * @param {string} permission - Permission to check
 * @returns {Array} Array of required permissions
 */
export const getPermissionDependencies = (permission) => {
  const dependencies = {
    workflow_execute: ["workflow_read"],
    workflow_update: ["workflow_read"],
    workflow_delete: ["workflow_read"],
    task_update: ["task_read"],
    task_complete: ["task_read"],
    task_assign: ["task_read"],
    user_update: ["user_read"],
    user_delete: ["user_read"],
  };

  return dependencies[permission] || [];
};

/**
 * Auto-select permission dependencies
 * @param {Array} selectedPermissions - Currently selected permissions
 * @param {string} newPermission - Newly selected permission
 * @returns {Array} Updated permissions array with dependencies
 */
export const autoSelectDependencies = (selectedPermissions, newPermission) => {
  const dependencies = getPermissionDependencies(newPermission);
  const updatedPermissions = [...selectedPermissions];

  dependencies.forEach((dep) => {
    if (!updatedPermissions.includes(dep)) {
      updatedPermissions.push(dep);
    }
  });

  return updatedPermissions;
};

/**
 * Get permission categories for display
 * @returns {Object} Permission categories with metadata
 */
export const getPermissionCategories = () => {
  return {
    workflow_management: {
      name: "Workflow Management",
      description: "Create, edit, and manage workflows",
      icon: "CogIcon",
      color: "blue",
    },
    task_management: {
      name: "Task Management",
      description: "Handle task assignments and completion",
      icon: "ClipboardDocumentListIcon",
      color: "green",
    },
    form_management: {
      name: "Forms Management",
      description: "Create and manage dynamic forms",
      icon: "DocumentTextIcon",
      color: "purple",
    },
    user_management: {
      name: "User Management",
      description: "Manage user accounts and profiles",
      icon: "UserGroupIcon",
      color: "orange",
    },
    system_administration: {
      name: "System Administration",
      description: "System configuration and maintenance",
      icon: "ShieldCheckIcon",
      color: "red",
    },
    reporting: {
      name: "Reporting & Analytics",
      description: "View and generate reports",
      icon: "ChartBarIcon",
      color: "indigo",
    },
    role_management: {
      name: "Role Management",
      description: "Manage roles and permissions",
      icon: "KeyIcon",
      color: "yellow",
    },
  };
};
