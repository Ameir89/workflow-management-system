// src/components/Admin/LookupsManagement/DataManagementTab.js
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { lookupsService } from "../../../services/lookupsService";
import { toast } from "react-toastify";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ListBulletIcon,
} from "@heroicons/react/24/outline";
import DataTable from "./DataTable";
import TableSelector from "./TableSelector";

const DataManagementTab = ({
  selectedTable,
  setSelectedTable,
  onEditRecord,
  onImport,
  onExport,
}) => {
  const queryClient = useQueryClient();
  const [selectedTableData, setSelectedTableData] = useState(selectedTable);

  // Fetch lookup tables for selector
  const { data: lookupTablesData } = useQuery(
    ["lookup-tables"],
    () => lookupsService.getLookupTables(),
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
    ["lookup-table-data", selectedTableData?.id],
    () =>
      selectedTableData?.id &&
      lookupsService.getLookupData(selectedTableData.id),
    {
      enabled: !!selectedTableData?.id,
      keepPreviousData: true,
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

  useEffect(() => {
    if (selectedTable) {
      setSelectedTableData(selectedTable);
    } else if (lookupTablesData?.tables?.length > 0) {
      setSelectedTableData(lookupTablesData.tables[0]);
    }
  }, [selectedTable, lookupTablesData]);

  const tableData = tableDataResponse?.data || [];

  const handleDeleteRecord = (record) => {
    if (
      window.confirm(
        "Are you sure you want to delete this record? This action cannot be undone."
      )
    ) {
      deleteRecordMutation.mutate({
        tableId: selectedTableData.id,
        recordId: record.id,
      });
    }
  };

  const handleTableChange = (table) => {
    setSelectedTableData(table);
    setSelectedTable(table);
  };

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
            onClick={onImport}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={!selectedTableData?.id}
          >
            <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
            Import CSV
          </button>
          <button
            onClick={() => onExport(selectedTableData?.id)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={!selectedTableData?.id}
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            Export
          </button>
          <button
            onClick={() => onEditRecord({})}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            disabled={!selectedTableData?.id}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Record
          </button>
        </div>
      </div>

      {/* Table Selection */}
      <TableSelector
        tables={lookupTablesData?.tables || []}
        selectedTable={selectedTableData}
        onTableChange={handleTableChange}
      />

      {/* Data Table */}
      {selectedTableData && selectedTableData.id && (
        <DataTable
          table={selectedTableData}
          data={tableData}
          onEditRecord={onEditRecord}
          onDeleteRecord={handleDeleteRecord}
          isDeleting={deleteRecordMutation.isLoading}
        />
      )}
    </div>
  );
};

export default DataManagementTab;
