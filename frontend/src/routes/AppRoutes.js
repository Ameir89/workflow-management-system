// src/routes/AppRoutes.js - Updated with Scripts Routes
import React, { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "../components/Layout/Layout";
import Login from "../components/Auth/Login";
import Dashboard from "../components/Dashboard/Dashboard";
import LoadingSpinner from "../components/Common/LoadingSpinner";
import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";

// Workflow components - Configuration
import WorkflowDesigner from "../components/WorkflowDesigner/WorkflowDesigner";
import WorkflowList from "../components/Workflows/WorkflowList";

// Workflow components - Instance Management
import StartInstancesHub from "../components/Workflows/StartInstancesHub";
import StartWorkflowInstance from "../components/Workflows/StartWorkflowInstance";
import WorkflowInstancesDashboard from "../components/Workflows/WorkflowInstancesDashboard";

// Task components
import TaskList from "../components/Tasks/TaskList";
import TaskDetail from "../components/Tasks/TaskDetail/TaskDetail";
import TaskForm from "../components/Tasks/TaskForm";

// Forms components
import FormsList from "../components/Forms/FormsList";
import FormBuilder from "../components/Forms/FormBuilder/FormBuilder";
import FormResponses from "../components/Forms/FormResponses";

// Scripts components
import ScriptsList from "../components/Scripts/ScriptsList";
import ScriptEditor from "../components/Scripts/ScriptEditor";
import ScriptExecutionHistory from "../components/Scripts/ScriptExecutionHistory";
import ScriptTemplates from "../components/Scripts/ScriptTemplates";
import ScriptAnalytics from "../components/Scripts/ScriptAnalytics";

// Webhooks components
import WebhooksList from "../components/Webhooks/WebhooksList";
import WebhookForm from "../components/Webhooks/WebhookForm";
import WebhookDeliveries from "../components/Webhooks/WebhookDeliveries";

// Files components
import FileManager from "../components/Files/FileManager";

// Notification components
import NotificationManagement from "../components/Notifications/NotificationManagement";
import NotificationTemplateForm from "../components/Notifications/Templates/NotificationTemplateForm";

// Admin components
import UserManagement from "../components/Admin/UserManagement/UserManagement";
import SystemHealth from "../components/Admin/SystemHealth";
import AuditLogs from "../components/Admin/AuditLogs";
import LookupsManagement from "../components/Admin/LookupsManagement/LookupsManagement";
import RolesManagement from "../components/Admin/RolesManagement";

// Other components
import Reports from "../components/Reports/Reports";
import Profile from "../components/Auth/Profile";

// Workflow Instance Detail Component (placeholder)
import WorkflowInstanceDetail from "../components/Workflows/WorkflowInstanceDetail";

const AppRoutes = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />

          {/* Workflow Configuration Routes */}
          <Route path="workflows/list" element={<WorkflowList />} />
          <Route
            path="workflows/designer"
            element={
              <ProtectedRoute
                requiredPermissions={["create_workflows", "manage_workflows"]}
              >
                <WorkflowDesigner />
              </ProtectedRoute>
            }
          />
          <Route
            path="workflows/designer/:id"
            element={
              <ProtectedRoute requiredPermissions={["manage_workflows"]}>
                <WorkflowDesigner />
              </ProtectedRoute>
            }
          />

          {/* Workflow Instance Management Routes */}
          <Route
            path="start-workflows"
            element={
              <ProtectedRoute
                requiredPermissions={["start_workflow_instances"]}
              >
                <StartInstancesHub />
              </ProtectedRoute>
            }
          />
          <Route
            path="workflows/:workflowId/start"
            element={
              <ProtectedRoute
                requiredPermissions={["start_workflow_instances"]}
              >
                <StartWorkflowInstance />
              </ProtectedRoute>
            }
          />

          {/* Workflow Instance Monitoring Routes */}
          <Route
            path="workflows/instances"
            element={
              <ProtectedRoute requiredPermissions={["view_workflow_instances"]}>
                <WorkflowInstancesDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="workflows/:workflowId/instances"
            element={
              <ProtectedRoute requiredPermissions={["view_workflow_instances"]}>
                <WorkflowInstancesDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="workflows/instances/:instanceId"
            element={
              <ProtectedRoute requiredPermissions={["view_workflow_instances"]}>
                <WorkflowInstanceDetail />
              </ProtectedRoute>
            }
          />

          {/* Task Routes */}
          <Route path="tasks" element={<TaskList />} />
          <Route path="tasks/:id" element={<TaskDetail />} />
          <Route path="tasks/:taskId/form" element={<TaskForm />} />
          <Route path="tasks/start" element={<TaskForm />} />

          {/* Forms Routes */}
          <Route path="forms" element={<FormsList />} />
          <Route
            path="forms/create"
            element={
              <ProtectedRoute requiredPermissions={["create_forms"]}>
                <FormBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="forms/:id/edit"
            element={
              <ProtectedRoute requiredPermissions={["manage_forms"]}>
                <FormBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="forms/:id/responses"
            element={
              <ProtectedRoute requiredPermissions={["view_form_responses"]}>
                <FormResponses />
              </ProtectedRoute>
            }
          />

          {/* Scripts Routes */}
          <Route
            path="scripts"
            element={
              <ProtectedRoute requiredPermissions={["view_scripts"]}>
                <ScriptsList />
              </ProtectedRoute>
            }
          />
          <Route
            path="scripts/create"
            element={
              <ProtectedRoute requiredPermissions={["create_scripts"]}>
                <ScriptEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="scripts/:id/edit"
            element={
              <ProtectedRoute requiredPermissions={["manage_scripts"]}>
                <ScriptEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="scripts/:id"
            element={
              <ProtectedRoute requiredPermissions={["view_scripts"]}>
                <ScriptEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="scripts/:id/history"
            element={
              <ProtectedRoute requiredPermissions={["view_scripts"]}>
                <ScriptExecutionHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="scripts/templates"
            element={
              <ProtectedRoute requiredPermissions={["view_script_templates"]}>
                <ScriptTemplates />
              </ProtectedRoute>
            }
          />
          <Route
            path="scripts/analytics"
            element={
              <ProtectedRoute requiredPermissions={["view_script_analytics"]}>
                <ScriptAnalytics />
              </ProtectedRoute>
            }
          />

          {/* Notification Routes */}
          <Route
            path="admin/notifications"
            element={
              <ProtectedRoute requiredPermissions={["view_notifications"]}>
                <NotificationManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/notifications/templates/create"
            element={
              <ProtectedRoute
                requiredPermissions={["manage_notification_templates"]}
              >
                <NotificationTemplateForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/notifications/templates/:id"
            element={
              <ProtectedRoute
                requiredPermissions={["view_notification_templates"]}
              >
                <NotificationTemplateForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/notifications/templates/:id/edit"
            element={
              <ProtectedRoute
                requiredPermissions={["manage_notification_templates"]}
              >
                <NotificationTemplateForm />
              </ProtectedRoute>
            }
          />

          {/* Webhooks Routes */}
          <Route
            path="webhooks"
            element={
              <ProtectedRoute requiredPermissions={["view_webhooks"]}>
                <WebhooksList />
              </ProtectedRoute>
            }
          />
          <Route
            path="webhooks/create"
            element={
              <ProtectedRoute requiredPermissions={["manage_webhooks"]}>
                <WebhookForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="webhooks/:id/edit"
            element={
              <ProtectedRoute requiredPermissions={["manage_webhooks"]}>
                <WebhookForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="webhooks/:id/deliveries"
            element={
              <ProtectedRoute requiredPermissions={["view_webhooks"]}>
                <WebhookDeliveries />
              </ProtectedRoute>
            }
          />

          {/* Files Routes */}
          <Route path="files" element={<FileManager />} />

          {/* Admin Routes */}
          <Route
            path="admin/users"
            element={
              <ProtectedRoute requiredPermissions={["manage_users"]}>
                <UserManagement />
              </ProtectedRoute>
            }
          />

          <Route
            path="admin/roles"
            element={
              <ProtectedRoute
                requiredPermissions={["manage_roles", "manage_users"]}
              >
                <RolesManagement />
              </ProtectedRoute>
            }
          />

          <Route
            path="admin/health"
            element={
              <ProtectedRoute requiredPermissions={["view_system_health"]}>
                <SystemHealth />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/audit-logs"
            element={
              <ProtectedRoute requiredPermissions={["view_audit_logs"]}>
                <AuditLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/lookups"
            element={
              <ProtectedRoute requiredPermissions={["manage_lookups"]}>
                <LookupsManagement />
              </ProtectedRoute>
            }
          />

          {/* Other Routes */}
          <Route
            path="reports"
            element={
              <ProtectedRoute requiredPermissions={["view_reports"]}>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
