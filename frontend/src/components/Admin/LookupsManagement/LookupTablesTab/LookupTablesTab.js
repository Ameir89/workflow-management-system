import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLookups } from "../../../../hooks/useLookups";
import {
  PlusIcon,
  TableCellsIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

import LoadingSpinner from "../../../Common/LoadingSpinner";
import EmptyState from "../../../Common/EmptyState";
import ConfirmDialog from "../../../Common/ConfirmDialog";
import TablesFilters from "./TablesFilters";
import TablesHeader from "./TablesHeader";
import TablesGrid from "./TablesGrid";

const LookupTablesTab = ({
  searchTerm,
  setSearchTerm,
  onCreateTable,
  onEditTable,
  onDeleteTable,
  onSelectTable,
  deleteTableMutation,
}) => {
  const { t } = useTranslation();
  const [deleteConfirm, setDeleteConfirm] = React.useState(null);

  // Fetch lookup tables
  const { useLookupsQuery } = useLookups();
  const {
    data: lookupTablesData,
    isLoading: tablesLoading,
    error: tablesError,
  } = useLookupsQuery({ search: searchTerm });

  // Filter tables based on search term
  const filteredTables = useMemo(() => {
    if (!lookupTablesData?.tables) return [];

    if (!searchTerm) return lookupTablesData.tables;

    const term = searchTerm.toLowerCase();
    return lookupTablesData.tables.filter(
      (table) =>
        table.name.toLowerCase().includes(term) ||
        table.display_name.toLowerCase().includes(term) ||
        table.description?.toLowerCase().includes(term)
    );
  }, [lookupTablesData?.tables, searchTerm]);

  // Event handlers
  const handleDeleteClick = (table) => {
    setDeleteConfirm(table);
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm) {
      onDeleteTable(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  const handleSearchClear = () => {
    setSearchTerm("");
  };

  // Loading state
  if (tablesLoading) {
    return <LoadingSpinner message={t("admin.lookups.loadingTables")} />;
  }

  // Error state
  if (tablesError) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          {t("admin.lookups.errorLoadingTables")}
        </h3>
        <p className="mt-1 text-sm text-gray-500">{tablesError.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <TablesHeader onCreateTable={onCreateTable} />

      {/* Search and Filters */}
      <TablesFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onSearchClear={handleSearchClear}
      />

      {/* Tables Grid */}
      {filteredTables.length > 0 ? (
        <TablesGrid
          tables={filteredTables}
          onEdit={onEditTable}
          onDelete={handleDeleteClick}
          onView={onSelectTable}
          isDeleting={deleteTableMutation.isLoading}
        />
      ) : (
        <EmptyState
          icon={TableCellsIcon}
          title={t("admin.lookups.noTablesFound")}
          description={
            searchTerm
              ? t("admin.lookups.noTablesMatchSearch")
              : t("admin.lookups.noTablesFoundDescription")
          }
          action={
            !searchTerm
              ? {
                  label: t("admin.lookups.createFirstTable"),
                  onClick: onCreateTable,
                  icon: PlusIcon,
                }
              : undefined
          }
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        title={t("admin.lookups.deleteTable")}
        message={t("admin.lookups.confirmDeleteTable", {
          name: deleteConfirm?.display_name || deleteConfirm?.name,
        })}
        confirmLabel={t("admin.lookups.deleteTable")}
        variant="danger"
        isLoading={deleteTableMutation.isLoading}
      />
    </div>
  );
};

export default LookupTablesTab;
