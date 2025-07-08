// src/components/Admin/LookupsManagement/DataManagementTab.js - Enhanced version
import React, { useState, useEffect } from "react";
import { useLookups, useLookupTable } from "../../../../hooks/useLookups";

import DataTable from "../DataTable/DataTable";
import TableSelector from "../TableSelector";
import LoadingSpinner from "../../../Common/LoadingSpinner";
import EmptyState from "../../../Common/EmptyState";
import DataManagementHeader from "./DataManagementHeader";

const DataManagementTab = ({
  selectedTable,
  setSelectedTable,
  onEditRecord,
  onImport,
  onExport,
}) => {
  const [selectedTableData, setSelectedTableData] = useState(selectedTable);

  // Hooks
  const { useLookupsQuery } = useLookups();
  const { data: lookupTablesData, isLoading: tablesLoading } =
    useLookupsQuery();

  const {
    data: tableData,
    isLoading: dataLoading,
    deleteRecord,
    isDeleting,
  } = useLookupTable(selectedTableData?.id);

  // Update selected table when prop changes
  useEffect(() => {
    if (selectedTable) {
      setSelectedTableData(selectedTable);
    } else if (lookupTablesData?.tables?.length > 0 && !selectedTableData) {
      setSelectedTableData(lookupTablesData.tables[0]);
    }
  }, [selectedTable, lookupTablesData, selectedTableData]);

  // Event handlers
  const handleDeleteRecord = (record) => {
    if (
      window.confirm(
        "Are you sure you want to delete this record? This action cannot be undone."
      )
    ) {
      deleteRecord(record.id);
    }
  };

  const handleTableChange = (table) => {
    setSelectedTableData(table);
    setSelectedTable(table);
  };

  // Loading state
  if (tablesLoading || dataLoading) {
    return <LoadingSpinner message="Loading data..." />;
  }

  // No tables state
  if (!lookupTablesData?.tables?.length) {
    return (
      <EmptyState
        title="No lookup tables found"
        description="Create your first lookup table to start managing data."
        action={{
          label: "Create Table",
          onClick: () => console.log("Navigate to create table"),
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <DataManagementHeader
        selectedTable={selectedTableData}
        onImport={onImport}
        onExport={() => onExport(selectedTableData?.id)}
        onAddRecord={() => onEditRecord({})}
      />

      {/* Table Selection */}
      <TableSelector
        tables={lookupTablesData?.tables || []}
        selectedTable={selectedTableData}
        onTableChange={handleTableChange}
      />

      {/* Data Table */}
      {selectedTableData?.id && (
        <DataTable
          table={selectedTableData}
          data={tableData}
          onEditRecord={onEditRecord}
          onDeleteRecord={handleDeleteRecord}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
};

export default DataManagementTab;
