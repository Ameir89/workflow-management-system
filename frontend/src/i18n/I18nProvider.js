import React from "react";
import i18n from "i18next";
import { initReactI18next, I18nextProvider } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Translation resources
const resources = {
  en: {
    translation: {
      // App
      app: {
        title: "Workflow Management System",
      },

      // Navigation
      nav: {
        dashboard: "Dashboard",
        workflows: "Workflows",
        tasks: "Tasks",
        forms: "Forms",
        files: "Files",
        webhooks: "Webhooks",
        reports: "Reports",
        admin: {
          title: "Administration",
          users: "User Management",
          health: "System Health",
        },
      },

      // Auth
      auth: {
        signInToAccount: "Sign in to your account",
        workflowManagementSystem: "Workflow Management System",
        username: "Username or Email",
        password: "Password",
        signIn: "Sign In",
        logout: "Logout",
        usernameRequired: "Username is required",
        passwordRequired: "Password is required",
        loginSuccess: "Login successful",
        loginFailed: "Login failed",
        twoFactorRequired: "Two-factor authentication required",
        twoFactorCode: "Two-factor code",
        enterSixDigitCode: "Enter 6-digit code",
        verify: "Verify",
        twoFactorFailed: "Two-factor authentication failed",
      },

      // Common
      common: {
        loading: "Loading...",
        save: "Save",
        cancel: "Cancel",
        delete: "Delete",
        edit: "Edit",
        create: "Create",
        update: "Update",
        close: "Close",
        back: "Back",
        next: "Next",
        previous: "Previous",
        search: "Search",
        filter: "Filter",
        all: "All",
        active: "Active",
        inactive: "Inactive",
        status: "Status",
        actions: "Actions",
        createdBy: "Created by",
        never: "Never",
        saving: "Saving...",
        submitting: "Submitting...",
        submit: "Submit",
      },

      // Dashboard
      dashboard: {
        title: "Dashboard",
        welcome: "Welcome to your workflow dashboard",
        totalTasks: "Total Tasks",
        pendingTasks: "Pending Tasks",
        overdueTasks: "Overdue Tasks",
        completionRate: "Completion Rate",
        taskDistribution: "Task Distribution",
        workflowTrends: "Workflow Trends",
        quickActions: "Quick Actions",
        createWorkflow: "Create Workflow",
        designNewWorkflow: "Design a new workflow",
        viewAllTasks: "View All Tasks",
        manageYourTasks: "Manage your tasks",
        viewReports: "View Reports",
        analyzePerformance: "Analyze performance",
        pending: "Pending",
        inProgress: "In Progress",
        completed: "Completed",
        overdue: "Overdue",
        workflowsStarted: "Workflows Started",
        workflowsCompleted: "Workflows Completed",
      },

      // Tasks
      tasks: {
        title: "Tasks",
        subtitle: "Manage and track your tasks",
        noTasks: "No tasks found",
        assignedTo: "Assigned to",
        dueDate: "Due date",
        priority: "Priority",
        workflow: "Workflow",
      },

      // Workflows
      workflows: {
        title: "Workflows",
        subtitle: "Design and manage workflows",
      },

      // Forms
      forms: {
        title: "Forms",
        subtitle: "Create and manage dynamic forms",
        createNew: "Create New Form",
        searchPlaceholder: "Search forms...",
        responses: "Responses",
        noForms: "No forms found",
        fieldTypes: {
          text: "Text",
          email: "Email",
          number: "Number",
          textarea: "Textarea",
          select: "Select",
          multiselect: "Multi Select",
          radio: "Radio",
          checkbox: "Checkbox",
          date: "Date",
          datetime: "Date Time",
          file: "File",
        },
      },

      // Files
      files: {
        title: "File Manager",
        subtitle: "Upload and manage files",
        upload: "Upload Files",
        download: "Download",
        dragDropFiles: "Drag and drop files here, or click to select",
        dropFiles: "Drop files here",
        maxFileSize: "Maximum file size: 50MB",
        totalFiles: "Total Files",
        totalSize: "Total Size",
        recentFiles: "Recent Files",
        access: {
          private: "Private",
          team: "Team",
          public: "Public",
        },
        types: {
          images: "Images",
          documents: "Documents",
          videos: "Videos",
          audio: "Audio",
        },
        noFiles: "No files found",
        noFilesDescription: "Upload your first file to get started",
      },

      // Webhooks
      webhooks: {
        title: "Webhooks",
        subtitle: "Configure webhook endpoints",
        createNew: "Create New Webhook",
        name: "Name",
        url: "URL",
        events: "Events",
        active: "Active",
        test: "Test",
        deliveries: "Deliveries",
        success: "Success",
        noWebhooks: "No webhooks found",
        noWebhooksDescription: "Create your first webhook to get started",
      },

      // Reports
      reports: {
        title: "Reports",
        subtitle: "Analytics and insights",
      },

      // Admin
      admin: {
        users: {
          title: "User Management",
          subtitle: "Manage system users",
          createNew: "Create New User",
          firstName: "First Name",
          lastName: "Last Name",
          username: "Username",
          email: "Email",
          phone: "Phone",
          roles: "Roles",
          active: "Active",
        },
        health: {
          title: "System Health",
          subtitle: "Monitor system status",
          overallStatus: "Overall Status",
          lastChecked: "Last checked",
          database: "Database",
          redis: "Redis",
          storage: "Storage",
          version: "Version",
          statistics: "Statistics",
          totalUsers: "Total Users",
          totalWorkflows: "Total Workflows",
          totalInstances: "Total Instances",
          totalTasks: "Total Tasks",
        },
      },

      // Notifications
      notifications: {
        title: "Notifications",
        all: "All",
        unread: "Unread",
        markAllRead: "Mark all as read",
        noNotifications: "No notifications",
      },
    },
  },
  ar: {
    translation: {
      // Arabic translations would go here
      app: {
        title: "نظام إدارة سير العمل",
      },
      nav: {
        dashboard: "لوحة التحكم",
        workflows: "سير العمل",
        tasks: "المهام",
        forms: "النماذج",
        files: "الملفات",
        webhooks: "روابط الويب",
        reports: "التقارير",
      },
      // ... more Arabic translations
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    lng: "en",

    interpolation: {
      escapeValue: false,
    },

    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
    },
  });

export const I18nProvider = ({ children }) => {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};

export default i18n;
