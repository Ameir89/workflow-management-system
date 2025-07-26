// src/components/Admin/NotificationManagement/index.js
export { default } from "./NotificationManagement";

// Export individual components for reuse
export { default as NotificationStats } from "./components/NotificationStats";
export { default as NotificationTabs } from "./components/NotificationTabs";
export { default as NotificationSettings } from "./components/Settings/NotificationSettings";

// Templates
export { default as TemplatesList } from "./components/Templates/TemplatesList";
export { default as NotificationTemplateForm } from "./components/Templates/NotificationTemplateForm";

// History
export { default as NotificationHistory } from "./components/history/NotificationHistory";
export { default as DeliveryStatus } from "./components/history/DeliveryStatus";
export { default as HistoryTable } from "./components/history/HistoryTable";

// Common reusable components
export { default as BulkActionBar } from "./components/common/BulkActionBar";
export { default as NotificationFilters } from "./components/common/NotificationFilters";
export { default as SearchAndSort } from "./components/common/SearchAndSort";

// Hooks
export { useNotificationManagement } from "./hooks/useNotificationManagement";
export { useTemplateVariables } from "./components/Templates/hooks/useTemplateVariables";
export { useUnsavedChanges } from "./components/Templates/hooks/useUnsavedChanges";

// Utils
export * from "./utils/templateUtils";
export * from "./components/Templates/utils/templateFormUtils";
