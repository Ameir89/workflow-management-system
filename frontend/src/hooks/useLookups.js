// src/hooks/useLookups.js
import { useQuery, useMutation, useQueryClient } from "react-query";
import { lookupsService } from "../services/lookupsService";
import { toast } from "react-toastify";

export const useLookups = () => {
  const queryClient = useQueryClient();

  // Fetch lookup tables
  const useLookupsQuery = (params = {}) => {
    return useQuery(
      ["lookup-tables", params],
      () => lookupsService.getLookupTables(params),
      {
        keepPreviousData: true,
        staleTime: 5 * 60 * 1000, // 5 minutes
      }
    );
  };

  // Fetch lookup data for a specific table
  const useLookupDataQuery = (tableId, params = {}) => {
    return useQuery(
      ["lookup-table-data", tableId, params],
      () => tableId && lookupsService.getLookupData(tableId, params),
      {
        enabled: !!tableId,
        keepPreviousData: true,
        staleTime: 2 * 60 * 1000, // 2 minutes
      }
    );
  };

  // Create table mutation
  const useCreateTableMutation = (options = {}) => {
    return useMutation(
      (tableData) => lookupsService.createLookupTable(tableData),
      {
        onSuccess: (data) => {
          toast.success("Lookup table created successfully");
          queryClient.invalidateQueries(["lookup-tables"]);
          options.onSuccess?.(data);
        },
        onError: (error) => {
          toast.error(error.message || "Failed to create lookup table");
          options.onError?.(error);
        },
      }
    );
  };

  // Update table mutation
  const useUpdateTableMutation = (options = {}) => {
    return useMutation(
      ({ id, data }) => lookupsService.updateLookupTable(id, data),
      {
        onSuccess: (data) => {
          toast.success("Lookup table updated successfully");
          queryClient.invalidateQueries(["lookup-tables"]);
          options.onSuccess?.(data);
        },
        onError: (error) => {
          toast.error(error.message || "Failed to update lookup table");
          options.onError?.(error);
        },
      }
    );
  };

  // Delete table mutation
  const useDeleteTableMutation = (options = {}) => {
    return useMutation((id) => lookupsService.deleteLookupTable(id), {
      onSuccess: (data, deletedId) => {
        toast.success("Lookup table deleted successfully");
        queryClient.invalidateQueries(["lookup-tables"]);
        // Also invalidate any data queries for this table
        queryClient.removeQueries(["lookup-table-data", deletedId]);
        options.onSuccess?.(data, deletedId);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete lookup table");
        options.onError?.(error);
      },
    });
  };

  // Create record mutation
  const useCreateRecordMutation = (tableId, options = {}) => {
    return useMutation(
      (recordData) => lookupsService.createLookupRecord(tableId, recordData),
      {
        onSuccess: (data) => {
          toast.success("Record created successfully");
          queryClient.invalidateQueries(["lookup-table-data", tableId]);
          options.onSuccess?.(data);
        },
        onError: (error) => {
          toast.error(error.message || "Failed to create record");
          options.onError?.(error);
        },
      }
    );
  };

  // Update record mutation
  const useUpdateRecordMutation = (tableId, options = {}) => {
    return useMutation(
      ({ recordId, recordData }) =>
        lookupsService.updateLookupRecord(tableId, recordId, recordData),
      {
        onSuccess: (data) => {
          toast.success("Record updated successfully");
          queryClient.invalidateQueries(["lookup-table-data", tableId]);
          options.onSuccess?.(data);
        },
        onError: (error) => {
          toast.error(error.message || "Failed to update record");
          options.onError?.(error);
        },
      }
    );
  };

  // Delete record mutation
  const useDeleteRecordMutation = (tableId, options = {}) => {
    return useMutation(
      (recordId) => lookupsService.deleteLookupRecord(tableId, recordId),
      {
        onSuccess: (data) => {
          toast.success("Record deleted successfully");
          queryClient.invalidateQueries(["lookup-table-data", tableId]);
          options.onSuccess?.(data);
        },
        onError: (error) => {
          toast.error(error.message || "Failed to delete record");
          options.onError?.(error);
        },
      }
    );
  };

  // Import data mutation
  const useImportDataMutation = (tableId, options = {}) => {
    return useMutation(
      (csvFile) => lookupsService.bulkImportData(tableId, csvFile),
      {
        onSuccess: (response) => {
          toast.success(
            `Successfully imported ${response.imported_count} records`
          );
          queryClient.invalidateQueries(["lookup-table-data", tableId]);
          options.onSuccess?.(response);
        },
        onError: (error) => {
          toast.error(error.message || "Failed to import data");
          options.onError?.(error);
        },
      }
    );
  };

  // Export data function
  const exportTableData = async (tableId, tableName, format = "csv") => {
    try {
      const blob = await lookupsService.exportTableData(tableId, format);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${tableName || "lookup_data"}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Data exported successfully");
    } catch (error) {
      toast.error("Failed to export data");
      throw error;
    }
  };

  // Get lookup options for forms
  const useLookupOptionsQuery = (tableId, params = {}) => {
    return useQuery(
      ["lookup-options", tableId, params],
      () => tableId && lookupsService.getLookupOptions(tableId, params),
      {
        enabled: !!tableId,
        staleTime: 10 * 60 * 1000, // 10 minutes - options don't change frequently
      }
    );
  };

  return {
    // Queries
    useLookupsQuery,
    useLookupDataQuery,
    useLookupOptionsQuery,

    // Table mutations
    useCreateTableMutation,
    useUpdateTableMutation,
    useDeleteTableMutation,

    // Record mutations
    useCreateRecordMutation,
    useUpdateRecordMutation,
    useDeleteRecordMutation,

    // Bulk operations
    useImportDataMutation,

    // Utilities
    exportTableData,
  };
};

// Hook for specific lookup table management
export const useLookupTable = (tableId) => {
  const {
    useLookupDataQuery,
    useCreateRecordMutation,
    useUpdateRecordMutation,
    useDeleteRecordMutation,
    useImportDataMutation,
    exportTableData,
  } = useLookups();

  const dataQuery = useLookupDataQuery(tableId);
  const createMutation = useCreateRecordMutation(tableId);
  const updateMutation = useUpdateRecordMutation(tableId);
  const deleteMutation = useDeleteRecordMutation(tableId);
  const importMutation = useImportDataMutation(tableId);

  return {
    data: dataQuery.data?.data || [],
    isLoading: dataQuery.isLoading,
    error: dataQuery.error,
    refetch: dataQuery.refetch,

    createRecord: createMutation.mutate,
    updateRecord: updateMutation.mutate,
    deleteRecord: deleteMutation.mutate,
    importData: importMutation.mutate,
    exportData: (tableName, format) =>
      exportTableData(tableId, tableName, format),

    isCreating: createMutation.isLoading,
    isUpdating: updateMutation.isLoading,
    isDeleting: deleteMutation.isLoading,
    isImporting: importMutation.isLoading,
  };
};

export default useLookups;
