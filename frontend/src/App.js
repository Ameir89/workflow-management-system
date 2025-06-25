// src/App.js - Refactored and simplified
import React from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { ToastContainer } from "react-toastify";
import { AuthProvider } from "./hooks/useAuth";
import { I18nProvider } from "./i18n/I18nProvider";
import AppRoutes from "./routes/AppRoutes";

import "react-toastify/dist/ReactToastify.css";
import "./styles/globals.css";

// Configure React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <Router
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <div className="App min-h-screen bg-gray-50">
              {/* Main Application Routes */}
              <AppRoutes />

              {/* Global Toast Notifications */}
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
                toastClassName="toast-custom"
                bodyClassName="toast-body-custom"
                progressClassName="toast-progress-custom"
              />
            </div>
          </Router>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;
