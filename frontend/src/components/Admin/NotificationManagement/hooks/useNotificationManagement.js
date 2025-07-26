// src/components/Admin/NotificationManagement/hooks/useNotificationManagement.js
import { useState, useCallback } from "react";

export const useNotificationManagement = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    status: "",
    type: "",
    category: "",
  });
  const [selectedItems, setSelectedItems] = useState([]);

  const resetFilters = useCallback(() => {
    setSearch("");
    setFilters({
      status: "",
      type: "",
      category: "",
    });
    setPage(1);
  }, []);

  const resetPage = useCallback(() => {
    setPage(1);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItems([]);
  }, []);

  return {
    page,
    setPage,
    search,
    setSearch,
    filters,
    setFilters,
    selectedItems,
    setSelectedItems,
    resetFilters,
    resetPage,
    clearSelection,
  };
};
