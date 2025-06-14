import React, { Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { ToastContainer } from "react-toastify";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { I18nProvider } from "./i18n/I18nProvider";
import Layout from "./components/Layout/Layout";
import Login from "./components/Auth/Login";
import Dashboard from "./components/Dashboard/Dashboard";

// Workflow components
import WorkflowDesigner from "./components/WorkflowDesigner/WorkflowDesigner";
import WorkflowList from "./components/Workflows/WorkflowList";

// Task components
import TaskList from "./components/Tasks/TaskList";
import TaskDetail from "./components/Tasks/TaskDetail";
import TaskForm from "./components/Tasks/TaskForm";

// Forms components
import FormsList from "./components/Forms/FormsList";
import FormBuilder from "./components/Forms/FormBuilder/FormBuilder";
import FormResponses from "./components/Forms/FormResponses";

// Webhooks components
import WebhooksList from "./components/Webhooks/WebhooksList";
import WebhookForm from "./components/Webhooks/WebhookForm";
import WebhookDeliveries from "./components/Webhooks/WebhookDeliveries";

// Files components
import FileManager from "./components/Files/FileManager";

// Admin components
import UserManagement from "./components/Admin/UserManagement";
import SystemHealth from "./components/Admin/SystemHealth";
import AuditLogs from "./components/Admin/AuditLogs";
import LookupsManagement from "./components/Admin/LookupsManagement";

// Other components
import Reports from "./components/Reports/Reports";
import Profile from "./components/Auth/Profile";
import LoadingSpinner from "./components/Common/LoadingSpinner";

import "react-toastify/dist/ReactToastify.css";
import "./styles/globals.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Protected Route Component
const ProtectedRoute = ({ children, requiredPermissions = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check permissions if required
  if (requiredPermissions.length > 0) {
    const userPermissions = user.permissions || [];
    const hasPermission =
      userPermissions.includes("*") ||
      requiredPermissions.some((permission) =>
        userPermissions.includes(permission)
      );

    if (!hasPermission) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

// Public Route Component
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <Router>
            <div className="App">
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
                    <Route
                      index
                      element={<Navigate to="/dashboard" replace />}
                    />
                    <Route path="dashboard" element={<Dashboard />} />

                    {/* Workflow Routes */}
                    <Route path="workflows" element={<WorkflowList />} />
                    <Route
                      path="workflows/designer"
                      element={
                        <ProtectedRoute
                          requiredPermissions={[
                            "create_workflows",
                            "manage_workflows",
                          ]}
                        >
                          <WorkflowDesigner />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="workflows/designer/:id"
                      element={
                        <ProtectedRoute
                          requiredPermissions={["manage_workflows"]}
                        >
                          <WorkflowDesigner />
                        </ProtectedRoute>
                      }
                    />

                    {/* Task Routes */}
                    <Route path="tasks" element={<TaskList />} />
                    <Route path="tasks/:id" element={<TaskDetail />} />
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
                        <ProtectedRoute
                          requiredPermissions={["view_form_responses"]}
                        >
                          <FormResponses />
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
                        <ProtectedRoute
                          requiredPermissions={["manage_webhooks"]}
                        >
                          <WebhookForm />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="webhooks/:id/edit"
                      element={
                        <ProtectedRoute
                          requiredPermissions={["manage_webhooks"]}
                        >
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
                      path="admin/health"
                      element={
                        <ProtectedRoute
                          requiredPermissions={["view_system_health"]}
                        >
                          <SystemHealth />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="admin/audit-logs"
                      element={
                        <ProtectedRoute
                          requiredPermissions={["view_audit_logs"]}
                        >
                          <AuditLogs />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="admin/lookups"
                      element={
                        <ProtectedRoute
                          requiredPermissions={["manage_lookups"]}
                        >
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

              <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
              />
            </div>
          </Router>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;
