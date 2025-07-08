import React, { useState, useMemo } from "react";
import TableHeaderRow from "./TableHeaderRow";
import TableBody from "./TableBody";
import TableLegend from "./TableLegend";
import ConfirmDialog from "../../../Common/ConfirmDialog";
import TableHeader from "./TableHeader";
import EmptyDataState from "./EmptyDataState";
import { useTranslation } from "react-i18next";

const DataTable = ({
  table,
  data = [],
  onEditRecord,
  onDeleteRecord,
  isDeleting,
}) => {
  const { t } = useTranslation();
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  // Transform API data structure for display
  const displayData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];

    return data.map((record) => ({
      id: record.id,
      ...record.data, // Flatten the nested data object
      _metadata: {
        created_at: record.created_at,
        updated_at: record.updated_at,
        is_active: record.is_active,
        sort_order: record.sort_order,
        created_by_name: record.created_by_name,
      },
    }));
  }, [data]);

  // Get display fields from table metadata
  const displayFields = useMemo(() => {
    if (!table || !table.additional_fields) return [];

    // Create field definitions from additional_fields array
    const fields = table.additional_fields.map((fieldName) => ({
      name: fieldName,
      displayName:
        fieldName.charAt(0).toUpperCase() +
        fieldName.slice(1).replace(/_/g, " "),
      type: "text", // Default type since API doesn't provide field types
      isValueField: fieldName === table.value_field,
      isDisplayField: fieldName === table.display_field,
      isRequired:
        fieldName === table.value_field || fieldName === table.display_field,
    }));

    // Always include ID field first
    return [
      {
        name: "id",
        displayName: "ID",
        type: "text",
        isValueField: false,
        isDisplayField: false,
        isRequired: false,
      },
      ...fields,
    ];
  }, [table]);

  // Sort data based on current sort configuration
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return displayData;

    return [...displayData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortConfig.direction === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [displayData, sortConfig]);

  // Handle sorting
  const handleSort = (fieldName) => {
    setSortConfig((prev) => ({
      key: fieldName,
      direction:
        prev.key === fieldName && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Handle delete confirmation
  const handleDeleteClick = (record) => {
    setDeleteConfirm(record);
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm) {
      onDeleteRecord(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  if (!table || !table.additional_fields) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <p className="text-gray-500">No table selected</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Table Header */}
      <TableHeader table={table} recordCount={displayData.length} />

      {/* Table Content */}
      {displayData.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <TableHeaderRow
                fields={displayFields}
                sortConfig={sortConfig}
                onSort={handleSort}
              />
              <TableBody
                data={sortedData}
                fields={displayFields}
                onEditRecord={onEditRecord}
                onDeleteRecord={handleDeleteClick}
              />
            </table>
          </div>
          <TableLegend fields={displayFields} />
        </>
      ) : (
        <EmptyDataState onAddRecord={() => onEditRecord({})} />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        title={t("admin.lookups.deleteRecord")}
        message={t("admin.lookups.confirmDeleteRecord")}
        confirmLabel={t("common.delete")}
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default DataTable;
