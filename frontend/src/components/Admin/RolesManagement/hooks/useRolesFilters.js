// src/components/Admin/RolesManagement/hooks/useRolesFilters.js
import { useState, useCallback, useMemo } from "react";
import { DEFAULT_FILTERS } from "../constants/rolesConstants";

export const useRolesFilters = (initialFilters = DEFAULT_FILTERS) => {
  const [filters, setFilters] = useState(initialFilters);

  const updateFilters = useCallback((newFilters) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      // Reset page when changing other filters
      page: newFilters.page !== undefined ? newFilters.page : 1,
    }));
  }, []);

  const updateSingleFilter = useCallback(
    (key, value) => {
      updateFilters({ [key]: value });
    },
    [updateFilters]
  );

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const updatePage = useCallback((page) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const updateSearch = useCallback(
    (search) => {
      updateFilters({ search });
    },
    [updateFilters]
  );

  const updateStatus = useCallback(
    (status) => {
      updateFilters({ status });
    },
    [updateFilters]
  );

  const updateSort = useCallback(
    (sortBy, sortOrder) => {
      updateFilters({ sortBy, sortOrder });
    },
    [updateFilters]
  );

  // Computed values
  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== DEFAULT_FILTERS.search ||
      filters.status !== DEFAULT_FILTERS.status ||
      filters.sortBy !== DEFAULT_FILTERS.sortBy ||
      filters.sortOrder !== DEFAULT_FILTERS.sortOrder
    );
  }, [filters]);

  const isFiltered = useMemo(() => {
    return (
      filters.search !== DEFAULT_FILTERS.search ||
      filters.status !== DEFAULT_FILTERS.status
    );
  }, [filters]);

  return {
    filters,
    updateFilters,
    updateSingleFilter,
    resetFilters,
    updatePage,
    updateSearch,
    updateStatus,
    updateSort,
    hasActiveFilters,
    isFiltered,
  };
};
