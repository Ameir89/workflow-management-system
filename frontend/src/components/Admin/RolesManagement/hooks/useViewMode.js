// src/components/Admin/RolesManagement/hooks/useViewMode.js
import { useState, useEffect } from "react";

const VIEW_MODE_STORAGE_KEY = "roles_view_mode";
const DEFAULT_VIEW_MODE = "grid";

export const useViewMode = () => {
  const [viewMode, setViewMode] = useState(() => {
    // Try to get saved view mode from localStorage
    try {
      return localStorage.getItem(VIEW_MODE_STORAGE_KEY) || DEFAULT_VIEW_MODE;
    } catch (error) {
      console.warn("Failed to read view mode from localStorage:", error);
      return DEFAULT_VIEW_MODE;
    }
  });

  // Save view mode to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
    } catch (error) {
      console.warn("Failed to save view mode to localStorage:", error);
    }
  }, [viewMode]);

  const toggleViewMode = () => {
    setViewMode((prev) => (prev === "grid" ? "list" : "grid"));
  };

  const setGridView = () => setViewMode("grid");
  const setListView = () => setViewMode("list");

  return {
    viewMode,
    setViewMode,
    toggleViewMode,
    setGridView,
    setListView,
    isGridView: viewMode === "grid",
    isListView: viewMode === "list",
  };
};
