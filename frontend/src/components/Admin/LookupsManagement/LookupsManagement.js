import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { lookupsService } from "../../../services/lookupsService";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  TableCellsIcon,
  ListBulletIcon,
  Cog6ToothIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

// Main Lookups Management Component
const LookupsManagement = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("tables");
  const [selectedTable, setSelectedTable] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingRecord, setEditingRecord] = useState(null);

  // Fetch lookup tables
  const {
    data: lookupTablesData,
    isLoading: tablesLoading,
    error: tablesError,
  } = useQuery(
    ["lookup-tables", searchTerm],
    () => lookupsService.getLookupTables({ search: searchTerm }),
    {
      keepPreviousData: true,
    }
  );

  // Fetch data for selected table
  const {
    data: tableDataResponse,
    isLoading: dataLoading,
    refetch: refetchTableData,
  } = useQuery(
    ["lookup-table-data", selectedTable?.id],
    () => selectedTable?.id && lookupsService.getLookupData(selectedTable.id),
    {
      enabled: !!selectedTable?.id,
      keepPreviousData: true,
    }
  );

  // Create table mutation
  const createTableMutation = useMutation(
    (tableData) => lookupsService.createLookupTable(tableData),
    {
      onSuccess: () => {
        toast.success("Lookup table created successfully");
        queryClient.invalidateQueries(["lookup-tables"]);
        setShowCreateModal(false);
        setSelectedTable(null);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create lookup table");
      },
    }
  );

  // Update table mutation
  const updateTableMutation = useMutation(
    ({ id, data }) => lookupsService.updateLookupTable(id, data),
    {
      onSuccess: () => {
        toast.success("Lookup table updated successfully");
        queryClient.invalidateQueries(["lookup-tables"]);
        setShowCreateModal(false);
        setSelectedTable(null);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update lookup table");
      },
    }
  );

  // Delete table mutation
  const deleteTableMutation = useMutation(
    (id) => lookupsService.deleteLookupTable(id),
    {
      onSuccess: (data, deletedId) => {
        toast.success("Lookup table deleted successfully");
        queryClient.invalidateQueries(["lookup-tables"]);
        if (selectedTable?.id === deletedId) {
          setSelectedTable(null);
          setActiveTab("tables");
        }
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete lookup table");
      },
    }
  );

  // Create record mutation
  const createRecordMutation = useMutation(
    ({ tableId, recordData }) =>
      lookupsService.createLookupRecord(tableId, recordData),
    {
      onSuccess: () => {
        toast.success("Record created successfully");
        refetchTableData();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create record");
      },
    }
  );

  // Update record mutation
  const updateRecordMutation = useMutation(
    ({ tableId, recordId, recordData }) =>
      lookupsService.updateLookupRecord(tableId, recordId, recordData),
    {
      onSuccess: () => {
        toast.success("Record updated successfully");
        refetchTableData();
        setEditingRecord(null);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update record");
      },
    }
  );

  // Delete record mutation
  const deleteRecordMutation = useMutation(
    ({ tableId, recordId }) =>
      lookupsService.deleteLookupRecord(tableId, recordId),
    {
      onSuccess: () => {
        toast.success("Record deleted successfully");
        refetchTableData();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete record");
      },
    }
  );

  // Import data mutation
  const importDataMutation = useMutation(
    ({ tableId, csvFile }) => lookupsService.bulkImportData(tableId, csvFile),
    {
      onSuccess: (response) => {
        toast.success(
          `Successfully imported ${response.imported_count} records`
        );
        refetchTableData();
        setShowImportModal(false);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to import data");
      },
    }
  );

  const tabs = [
    { id: "tables", name: "Lookup Tables", icon: TableCellsIcon },
    { id: "data", name: "Manage Data", icon: ListBulletIcon },
    { id: "settings", name: "Settings", icon: Cog6ToothIcon },
  ];

  // Handle export
  const handleExport = async (tableId, format = "csv") => {
    try {
      const blob = await lookupsService.exportTableData(tableId, format);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${selectedTable?.name || "lookup_data"}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Data exported successfully");
    } catch (error) {
      toast.error("Failed to export data");
    }
  };

  // Handle delete table with confirmation
  const handleDeleteTable = (table) => {
    if (
      window.confirm(
        `Are you sure you want to delete the lookup table "${table.displayName}"? This action cannot be undone.`
      )
    ) {
      deleteTableMutation.mutate(table.id);
    }
  };

  // Handle delete record with confirmation
  const handleDeleteRecord = (record) => {
    if (
      window.confirm(
        "Are you sure you want to delete this record? This action cannot be undone."
      )
    ) {
      deleteRecordMutation.mutate({
        tableId: selectedTable.id,
        recordId: record.id,
      });
    }
  };

  // Lookup Tables Tab
  const LookupTablesTab = () => {
    const filteredTables =
      lookupTablesData?.tables?.filter(
        (table) =>
          table.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          table.displayName.toLowerCase().includes(searchTerm.toLowerCase())
      ) || [];

    if (tablesLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      );
    }

    if (tablesError) {
      return (
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Error Loading Tables
          </h3>
          <p className="mt-1 text-sm text-gray-500">{tablesError.message}</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Lookup Tables
            </h2>
            <p className="text-sm text-gray-600">
              Manage your lookup tables and their structure
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Table
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex space-x-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search lookup tables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters
          </button>
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTables.map((table) => (
            <div
              key={table.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <TableCellsIcon className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {table.displayName || table.name}
                    </h3>
                    <p className="text-sm text-gray-500">{table.name}</p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    table.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {table.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <p className="text-sm text-gray-600 mt-3">
                {table.description || "No description"}
              </p>

              <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                <span>{table.fields?.length || 0} fields</span>
                <span>{table.recordCount || 0} records</span>
              </div>

              <div className="mt-4 flex space-x-2">
                <button
                  onClick={() => {
                    setSelectedTable(table);
                    setActiveTab("data");
                  }}
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100"
                >
                  <EyeIcon className="h-4 w-4 mr-1" />
                  View Data
                </button>
                <button
                  onClick={() => {
                    setSelectedTable(table);
                    setShowCreateModal(true);
                  }}
                  className="inline-flex items-center px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteTable(table)}
                  className="inline-flex items-center px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                  disabled={deleteTableMutation.isLoading}
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredTables.length === 0 && (
          <div className="text-center py-12">
            <TableCellsIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No lookup tables found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm
                ? "No tables match your search criteria."
                : "Get started by creating your first lookup table."}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Your First Table
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Data Management Tab
  const DataManagementTab = () => {
    const [selectedTableData, setSelectedTableData] = useState(
      selectedTable || lookupTablesData?.tables?.[0]
    );

    useEffect(() => {
      if (selectedTable) {
        setSelectedTableData(selectedTable);
      } else if (lookupTablesData?.tables?.length > 0) {
        setSelectedTableData(lookupTablesData.tables[0]);
      }
    }, [selectedTable, lookupTablesData]);

    const tableData = tableDataResponse?.data || [];

    if (dataLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Manage Data</h2>
            <p className="text-sm text-gray-600">
              Add, edit, and manage lookup data
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={!selectedTableData?.id}
            >
              <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
              Import CSV
            </button>
            <button
              onClick={() => handleExport(selectedTableData?.id)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={!selectedTableData?.id}
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Export
            </button>
            <button
              onClick={() => setEditingRecord({})}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              disabled={!selectedTableData?.id}
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Record
            </button>
          </div>
        </div>

        {/* Table Selection */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Lookup Table
          </label>
          <select
            value={selectedTableData?.id || ""}
            onChange={(e) => {
              const table = lookupTablesData?.tables?.find(
                (t) => t.id === parseInt(e.target.value)
              );
              setSelectedTableData(table);
              setSelectedTable(table);
            }}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select a table...</option>
            {lookupTablesData?.tables?.map((table) => (
              <option key={table.id} value={table.id}>
                {table.displayName || table.name}
              </option>
            ))}
          </select>
        </div>

        {/* Data Table */}
        {selectedTableData && selectedTableData.id && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedTableData.displayName || selectedTableData.name} Data
              </h3>
              <p className="text-sm text-gray-600">
                {tableData.length} records
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {selectedTableData.fields?.map((field) => (
                      <th
                        key={field.name}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {field.displayName || field.name}
                        {field.isValueField && (
                          <span className="ml-1 text-indigo-600">*</span>
                        )}
                        {field.isDisplayField && (
                          <span className="ml-1 text-green-600">•</span>
                        )}
                      </th>
                    ))}
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tableData.map((row, index) => (
                    <tr key={row.id || index} className="hover:bg-gray-50">
                      {selectedTableData.fields?.map((field) => (
                        <td
                          key={field.name}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        >
                          {row[field.name]}
                        </td>
                      ))}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => setEditingRecord(row)}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRecord(row)}
                          className="text-red-600 hover:text-red-900"
                          disabled={deleteRecordMutation.isLoading}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Empty State for Data */}
            {tableData.length === 0 && (
              <div className="text-center py-12">
                <ListBulletIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No data found
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by adding your first record.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => setEditingRecord({})}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add First Record
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Create/Edit Table Modal
  const CreateTableModal = () => {
    const [tableName, setTableName] = useState(selectedTable?.name || "");
    const [displayName, setDisplayName] = useState(
      selectedTable?.displayName || ""
    );
    const [description, setDescription] = useState(
      selectedTable?.description || ""
    );
    const [fields, setFields] = useState(
      selectedTable?.fields || [
        {
          name: "id",
          type: "number",
          displayName: "ID",
          isValueField: true,
          isDisplayField: false,
        },
        {
          name: "name",
          type: "text",
          displayName: "Name",
          isValueField: false,
          isDisplayField: true,
        },
      ]
    );

    const addField = () => {
      setFields([
        ...fields,
        {
          name: "",
          type: "text",
          displayName: "",
          isValueField: false,
          isDisplayField: false,
        },
      ]);
    };

    const removeField = (index) => {
      setFields(fields.filter((_, i) => i !== index));
    };

    const updateField = (index, field, value) => {
      const updatedFields = [...fields];
      updatedFields[index][field] = value;
      setFields(updatedFields);
    };

    const handleSubmit = () => {
      const tableData = {
        name: tableName,
        displayName,
        description,
        fields,
        isActive: true,
      };

      if (selectedTable?.id) {
        updateTableMutation.mutate({ id: selectedTable.id, data: tableData });
      } else {
        createTableMutation.mutate(tableData);
      }
    };

    return showCreateModal ? (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {selectedTable ? "Edit" : "Create"} Lookup Table
            </h3>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Table Name *
                  </label>
                  <input
                    type="text"
                    value={tableName}
                    onChange={(e) => setTableName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., countries"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Countries"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Describe what this lookup table contains..."
                />
              </div>

              {/* Fields Configuration */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-medium text-gray-900">
                    Fields Configuration
                  </h4>
                  <button
                    onClick={addField}
                    className="inline-flex items-center px-3 py-2 text-sm bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100"
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Field
                  </button>
                </div>

                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-12 gap-3 items-end p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="col-span-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Field Name
                        </label>
                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) =>
                            updateField(index, "name", e.target.value)
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                          placeholder="field_name"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Display Name
                        </label>
                        <input
                          type="text"
                          value={field.displayName}
                          onChange={(e) =>
                            updateField(index, "displayName", e.target.value)
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                          placeholder="Display Name"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Type
                        </label>
                        <select
                          value={field.type}
                          onChange={(e) =>
                            updateField(index, "type", e.target.value)
                          }
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="date">Date</option>
                          <option value="boolean">Boolean</option>
                        </select>
                      </div>
                      <div className="col-span-1">
                        <label className="flex items-center text-xs text-gray-700">
                          <input
                            type="checkbox"
                            checked={field.isValueField}
                            onChange={(e) =>
                              updateField(
                                index,
                                "isValueField",
                                e.target.checked
                              )
                            }
                            className="mr-1 h-3 w-3 text-indigo-600 rounded"
                          />
                          Value
                        </label>
                      </div>
                      <div className="col-span-1">
                        <label className="flex items-center text-xs text-gray-700">
                          <input
                            type="checkbox"
                            checked={field.isDisplayField}
                            onChange={(e) =>
                              updateField(
                                index,
                                "isDisplayField",
                                e.target.checked
                              )
                            }
                            className="mr-1 h-3 w-3 text-green-600 rounded"
                          />
                          Display
                        </label>
                      </div>
                      <div className="col-span-1">
                        <button
                          onClick={() => removeField(index)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 text-xs text-gray-500">
                  <p>
                    <span className="text-indigo-600">*</span> Value field: Used
                    as the actual value stored in forms
                  </p>
                  <p>
                    <span className="text-green-600">•</span> Display field:
                    Shown to users in dropdowns
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowCreateModal(false);
                setSelectedTable(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={
                createTableMutation.isLoading || updateTableMutation.isLoading
              }
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              disabled={
                createTableMutation.isLoading || updateTableMutation.isLoading
              }
            >
              {createTableMutation.isLoading ||
              updateTableMutation.isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : selectedTable ? (
                "Update Table"
              ) : (
                "Create Table"
              )}
            </button>
          </div>
        </div>
      </div>
    ) : null;
  };

  // Record Edit Modal
  const RecordEditModal = () => {
    const [recordData, setRecordData] = useState({});

    useEffect(() => {
      if (editingRecord) {
        setRecordData(editingRecord);
      }
    }, [editingRecord]);

    const handleFieldChange = (fieldName, value) => {
      setRecordData((prev) => ({
        ...prev,
        [fieldName]: value,
      }));
    };

    const handleSubmit = () => {
      if (recordData.id) {
        // Update existing record
        updateRecordMutation.mutate({
          tableId: selectedTable.id,
          recordId: recordData.id,
          recordData: recordData,
        });
      } else {
        // Create new record
        createRecordMutation.mutate({
          tableId: selectedTable.id,
          recordData: recordData,
        });
      }
    };

    const isEditing = recordData.id;

    return editingRecord ? (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                {isEditing ? "Edit Record" : "Add New Record"}
              </h3>
              <button
                onClick={() => setEditingRecord(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {selectedTable?.fields?.map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.displayName || field.name}
                    {field.isValueField && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </label>
                  {field.type === "boolean" ? (
                    <select
                      value={recordData[field.name] || ""}
                      onChange={(e) =>
                        handleFieldChange(field.name, e.target.value === "true")
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select...</option>
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  ) : (
                    <input
                      type={
                        field.type === "number"
                          ? "number"
                          : field.type === "date"
                          ? "date"
                          : "text"
                      }
                      value={recordData[field.name] || ""}
                      onChange={(e) =>
                        handleFieldChange(field.name, e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder={`Enter ${field.displayName || field.name}`}
                      required={field.isValueField}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={() => setEditingRecord(null)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={
                createRecordMutation.isLoading || updateRecordMutation.isLoading
              }
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              disabled={
                createRecordMutation.isLoading || updateRecordMutation.isLoading
              }
            >
              {createRecordMutation.isLoading ||
              updateRecordMutation.isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : isEditing ? (
                "Update Record"
              ) : (
                "Create Record"
              )}
            </button>
          </div>
        </div>
      </div>
    ) : null;
  };

  // Import Modal
  const ImportModal = () => {
    const [csvFile, setCsvFile] = useState(null);
    const [dragOver, setDragOver] = useState(false);

    const handleFileSelect = (file) => {
      if (file && file.type === "text/csv") {
        setCsvFile(file);
      } else {
        toast.error("Please select a valid CSV file");
      }
    };

    const handleDrop = (e) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      handleFileSelect(file);
    };

    const handleImport = () => {
      if (csvFile && selectedTable?.id) {
        importDataMutation.mutate({
          tableId: selectedTable.id,
          csvFile: csvFile,
        });
      }
    };

    return showImportModal ? (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                Import CSV Data
              </h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className="p-6">
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center ${
                dragOver ? "border-indigo-500 bg-indigo-50" : "border-gray-300"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              {csvFile ? (
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {csvFile.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(csvFile.size / 1024).toFixed(2)} KB
                  </p>
                  <button
                    onClick={() => setCsvFile(null)}
                    className="mt-2 text-sm text-red-600 hover:text-red-800"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div>
                  <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    Drop your CSV file here, or{" "}
                    <label className="text-indigo-600 hover:text-indigo-500 cursor-pointer">
                      browse
                      <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={(e) => handleFileSelect(e.target.files[0])}
                      />
                    </label>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">CSV files only</p>
                </div>
              )}
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900">
                Import Guidelines:
              </h4>
              <ul className="text-xs text-blue-800 mt-1 space-y-1">
                <li>• First row should contain column headers</li>
                <li>• Column names should match field names in the table</li>
                <li>• Required fields must have values</li>
                <li>• Existing records with matching IDs will be updated</li>
              </ul>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={() => setShowImportModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={importDataMutation.isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              disabled={!csvFile || importDataMutation.isLoading}
            >
              {importDataMutation.isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                "Import Data"
              )}
            </button>
          </div>
        </div>
      </div>
    ) : null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Lookups Management
          </h1>
          <p className="text-gray-600 mt-2">
            Manage lookup tables and data for your forms and workflows
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "tables" && <LookupTablesTab />}
        {activeTab === "data" && <DataManagementTab />}
        {activeTab === "settings" && (
          <div className="text-center py-12">
            <Cog6ToothIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Settings</h3>
            <p className="mt-1 text-sm text-gray-500">
              Configure lookup system settings
            </p>
          </div>
        )}

        {/* Modals */}
        <CreateTableModal />
        <RecordEditModal />
        <ImportModal />
      </div>
    </div>
  );
};

export default LookupsManagement;
