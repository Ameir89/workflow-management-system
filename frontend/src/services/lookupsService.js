// services/lookupsService.js
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

  // Lookup Data Management
  getLookupData: async (tableId, params = {}) => {
    const response = await api.get(`/lookups/tables/${tableId}/data`, {
      params,
    });
    return response.data;
  },

  createLookupRecord: async (tableId, recordData) => {
    const response = await api.post(
      `/lookups/tables/${tableId}/data`,
      recordData
    );
    return response.data;
  },

  updateLookupRecord: async (tableId, recordId, recordData) => {
    const response = await api.put(
      `/lookups/tables/${tableId}/data/${recordId}`,
      recordData
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

// components/Forms/LookupSelect.js
import React, { useState, useEffect, useMemo } from "react";
import Select from "react-select";
import AsyncSelect from "react-select/async";
import { lookupsService } from "../../services/lookupsService";
import {
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

const LookupSelect = ({
  lookupTable,
  lookupConfig,
  value,
  onChange,
  isMulti = false,
  placeholder = "Select...",
  isDisabled = false,
  error = null,
  className = "",
  isSearchable = true,
  isClearable = true,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [lookupError, setLookupError] = useState(null);
  const [cachedOptions, setCachedOptions] = useState([]);

  // Custom styles for React Select with lookup-specific enhancements
  const customStyles = {
    control: (provided, state) => ({
      ...provided,
      minHeight: "42px",
      borderColor: error ? "#ef4444" : state.isFocused ? "#6366f1" : "#d1d5db",
      borderRadius: "8px",
      boxShadow: state.isFocused ? "0 0 0 3px rgba(99, 102, 241, 0.1)" : "none",
      "&:hover": {
        borderColor: error ? "#ef4444" : "#9ca3af",
      },
      backgroundColor: isDisabled ? "#f9fafb" : "white",
    }),
    placeholder: (provided) => ({
      ...provided,
      color: "#9ca3af",
      fontSize: "14px",
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? "#6366f1"
        : state.isFocused
        ? "#f0f9ff"
        : "white",
      color: state.isSelected ? "white" : "#374151",
      padding: "12px 16px",
      cursor: "pointer",
      borderBottom: "1px solid #f3f4f6",
      "&:active": {
        backgroundColor: "#6366f1",
      },
    }),
    multiValue: (provided) => ({
      ...provided,
      backgroundColor: "#e0e7ff",
      borderRadius: "6px",
      border: "1px solid #c7d2fe",
    }),
    multiValueLabel: (provided) => ({
      ...provided,
      color: "#3730a3",
      fontSize: "14px",
      padding: "4px 8px",
    }),
    multiValueRemove: (provided) => ({
      ...provided,
      color: "#6366f1",
      "&:hover": {
        backgroundColor: "#c7d2fe",
        color: "#3730a3",
      },
    }),
    loadingMessage: (provided) => ({
      ...provided,
      color: "#6b7280",
      fontSize: "14px",
    }),
    noOptionsMessage: (provided) => ({
      ...provided,
      color: "#6b7280",
      fontSize: "14px",
    }),
  };

  // Format data for React Select
  const formatOptionData = (items) => {
    if (!Array.isArray(items)) return [];

    return items.map((item) => {
      const value = item[lookupConfig.valueField];
      const label = item[lookupConfig.displayField];

      // Include additional fields if specified
      const additionalData = {};
      if (
        lookupConfig.additionalFields &&
        Array.isArray(lookupConfig.additionalFields)
      ) {
        lookupConfig.additionalFields.forEach((fieldName) => {
          if (item[fieldName] !== undefined) {
            additionalData[fieldName] = item[fieldName];
          }
        });
      }

      return {
        value,
        label,
        data: item, // Full record data
        ...additionalData, // Spread additional fields for easy access
      };
    });
  };

  // Load options for static select
  const loadOptions = async () => {
    if (
      !lookupTable ||
      !lookupConfig.valueField ||
      !lookupConfig.displayField
    ) {
      setLookupError("Invalid lookup configuration");
      return [];
    }

    setIsLoading(true);
    setLookupError(null);

    try {
      const response = await lookupsService.getLookupOptions(lookupTable, {
        valueField: lookupConfig.valueField,
        displayField: lookupConfig.displayField,
        additionalFields: lookupConfig.additionalFields,
      });

      const formattedOptions = formatOptionData(response.data || []);
      setCachedOptions(formattedOptions);
      return formattedOptions;
    } catch (error) {
      setLookupError(error.message || "Failed to load lookup options");
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Load options for async search
  const loadAsyncOptions = async (searchTerm) => {
    if (
      !lookupTable ||
      !lookupConfig.valueField ||
      !lookupConfig.displayField
    ) {
      return [];
    }

    try {
      const response = await lookupsService.searchLookupOptions(
        lookupTable,
        searchTerm,
        {
          valueField: lookupConfig.valueField,
          displayField: lookupConfig.displayField,
          additionalFields: lookupConfig.additionalFields,
          limit: 50,
        }
      );

      return formatOptionData(response.data || []);
    } catch (error) {
      console.error("Failed to search lookup options:", error);
      return [];
    }
  };
};
