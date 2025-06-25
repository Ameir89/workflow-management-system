// src/routes/ProtectedRoute.js
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import LoadingSpinner from "../components/Common/LoadingSpinner";

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

export default ProtectedRoute;
