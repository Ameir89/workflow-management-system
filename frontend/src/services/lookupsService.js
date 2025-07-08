import { api } from "./authService";

export const lookupsService = {
  // Lookup Tables Management
  getLookupTables: async (params = {}) => {
    const response = await api.get("/lookups/tables", { params });
    return response.data;
  },

  createLookupTable: async (tableData) => {
    const response = await api.post("/lookups/tables", tableData);
    return response.data;
  },

  updateLookupTable: async (id, tableData) => {
    const response = await api.put(`/lookups/tables/${id}`, tableData);
    return response.data;
  },

  deleteLookupTable: async (id) => {
    const response = await api.delete(`/lookups/tables/${id}`);
    return response.data;
  },

  getLookupTable: async (id) => {
    const response = await api.get(`/lookups/tables/${id}`);
    return response.data;
  },

  // Lookup Data Management - Updated to handle API response structure
  getLookupData: async (tableId, params = {}) => {
    const response = await api.get(`/lookups/tables/${tableId}/data`, {
      params,
    });

    // Return the data array directly, but preserve table metadata
    return {
      data: response.data.data || [],
      table: response.data.table || {},
      pagination: response.data.pagination || {},
    };
  },

  createLookupRecord: async (tableId, recordData) => {
    // API expects the data in a specific format
    const payload = {
      data: recordData,
      is_active: true,
    };

    const response = await api.post(`/lookups/tables/${tableId}/data`, payload);
    return response.data;
  },

  updateLookupRecord: async (tableId, recordId, recordData) => {
    // API expects the data in a specific format
    const payload = {
      data: recordData,
      is_active: true,
    };

    const response = await api.put(
      `/lookups/tables/${tableId}/data/${recordId}`,
      payload
    );
    return response.data;
  },

  deleteLookupRecord: async (tableId, recordId) => {
    const response = await api.delete(
      `/lookups/tables/${tableId}/data/${recordId}`
    );
    return response.data;
  },

  // Bulk Operations
  bulkImportData: async (tableId, csvData) => {
    const formData = new FormData();
    formData.append("file", csvData);
    const response = await api.post(
      `/lookups/tables/${tableId}/import`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return response.data;
  },

  exportTableData: async (tableId, format = "csv") => {
    const response = await api.get(`/lookups/tables/${tableId}/export`, {
      params: { format },
      responseType: "blob",
    });
    return response.data;
  },

  // Form Integration
  getLookupOptions: async (tableId, params = {}) => {
    const response = await api.get(`/lookups/tables/${tableId}/options`, {
      params,
    });
    return response.data;
  },

  searchLookupOptions: async (tableId, searchTerm, params = {}) => {
    const response = await api.get(`/lookups/tables/${tableId}/search`, {
      params: { q: searchTerm, ...params },
    });
    return response.data;
  },
};
