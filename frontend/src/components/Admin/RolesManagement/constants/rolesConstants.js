// src/components/Admin/RolesManagement/constants/rolesConstants.js

// Default filters for roles listing
export const DEFAULT_FILTERS = {
  page: 1,
  search: "",
  status: "all",
  sortBy: "name",
  sortOrder: "asc",
};

// View mode options
export const VIEW_MODES = {
  GRID: "grid",
  LIST: "list",
};

export const DEFAULT_VIEW_MODE = VIEW_MODES.GRID;

// Role form validation rules
export const ROLE_FORM_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
};

// Role status options
export const ROLE_STATUS = {
  ALL: "all",
  ACTIVE: "active",
  INACTIVE: "inactive",
  SYSTEM: "system",
};

// Sort options
export const SORT_OPTIONS = {
  NAME_ASC: { sortBy: "name", sortOrder: "asc" },
  NAME_DESC: { sortBy: "name", sortOrder: "desc" },
  CREATED_AT_DESC: { sortBy: "created_at", sortOrder: "desc" },
  CREATED_AT_ASC: { sortBy: "created_at", sortOrder: "asc" },
  USER_COUNT_DESC: { sortBy: "user_count", sortOrder: "desc" },
};

// Pagination settings
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
};

// Permission categories for grouping
export const PERMISSION_CATEGORIES = {
  WORKFLOW_MANAGEMENT: "workflow_management",
  TASK_MANAGEMENT: "task_management",
  FORM_MANAGEMENT: "form_management",
  USER_MANAGEMENT: "user_management",
  SYSTEM_ADMINISTRATION: "system_administration",
  REPORTING: "reporting",
  ROLE_MANAGEMENT: "role_management",
  SLA_MANAGEMENT: "sla_management",
  LOOKUP_MANAGEMENT: "lookup_management",
  FILE_MANAGEMENT: "file_management",
  AUTOMATION: "automation",
  OTHER: "other",
};

// Role actions
export const ROLE_ACTIONS = {
  CREATE: "create",
  READ: "read",
  UPDATE: "update",
  DELETE: "delete",
  BULK_UPDATE: "bulk_update",
  BULK_DELETE: "bulk_delete",
  ACTIVATE: "activate",
  DEACTIVATE: "deactivate",
};

// LocalStorage keys
export const STORAGE_KEYS = {
  VIEW_MODE: "roles_view_mode",
  FILTERS: "roles_filters",
  PAGE_SIZE: "roles_page_size",
};

// Role card display settings
export const ROLE_CARD = {
  MAX_PERMISSIONS_PREVIEW: 3,
  MAX_DESCRIPTION_LENGTH: 100,
};

// Role list display settings
export const ROLE_LIST = {
  MAX_PERMISSIONS_PREVIEW: 2,
  MAX_DESCRIPTION_LENGTH: 80,
};

// Animation durations (in milliseconds)
export const ANIMATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
};

// Toast notification settings
export const TOAST_CONFIG = {
  POSITION: "top-right",
  AUTO_CLOSE: 5000,
  HIDE_PROGRESS_BAR: false,
  CLOSE_ON_CLICK: true,
  PAUSE_ON_HOVER: true,
  DRAGGABLE: true,
};

// Modal settings
export const MODAL_CONFIG = {
  BACKDROP_CLOSE: true,
  ESCAPE_KEY_CLOSE: true,
  FOCUS_TRAP: true,
};

// API endpoints (relative to base API URL)
export const API_ENDPOINTS = {
  ROLES: "/admin/roles",
  PERMISSIONS: "/admin/permissions",
  BULK_ROLES: "/admin/roles/bulk",
};

// Error messages
export const ERROR_MESSAGES = {
  GENERIC: "An unexpected error occurred",
  NETWORK: "Network error. Please check your connection",
  VALIDATION: "Please check the form for errors",
  PERMISSION_DENIED: "You don't have permission to perform this action",
  ROLE_NOT_FOUND: "Role not found",
  CANNOT_DELETE_SYSTEM_ROLE: "System roles cannot be deleted",
  CANNOT_DELETE_ROLE_WITH_USERS: "Cannot delete role with assigned users",
};

// Success messages
export const SUCCESS_MESSAGES = {
  ROLE_CREATED: "Role created successfully",
  ROLE_UPDATED: "Role updated successfully",
  ROLE_DELETED: "Role deleted successfully",
  BULK_OPERATION_COMPLETED: "Bulk operation completed successfully",
};

// Component display names (for debugging)
export const COMPONENT_NAMES = {
  ROLES_MANAGEMENT: "RolesManagement",
  ROLES_GRID: "RolesGrid",
  ROLES_LIST: "RolesList",
  ROLE_CARD: "RoleCard",
  ROLE_FORM_MODAL: "RoleFormModal",
  ROLES_FILTERS: "RolesFilters",
  VIEW_TOGGLE: "ViewToggle",
  EMPTY_STATE: "EmptyState",
};
