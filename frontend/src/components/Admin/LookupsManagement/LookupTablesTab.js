// src/components/Admin/LookupsManagement/LookupTablesTab.js
import React from "react";
import { useQuery } from "react-query";
import { lookupsService } from "../../../services/lookupsService";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  TableCellsIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

const LookupTablesTab = ({
  searchTerm,
  setSearchTerm,
  onCreateTable,
  onEditTable,
  onDeleteTable,
  onSelectTable,
  deleteTableMutation,
}) => {
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
          <h2 className="text-xl font-semibold text-gray-900">Lookup Tables</h2>
          <p className="text-sm text-gray-600">
            Manage your lookup tables and their structure
          </p>
        </div>
        <button
          onClick={onCreateTable}
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
          <TableCard
            key={table.id}
            table={table}
            onEdit={() => onEditTable(table)}
            onDelete={() => onDeleteTable(table)}
            onView={() => onSelectTable(table)}
            isDeleting={deleteTableMutation.isLoading}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredTables.length === 0 && (
        <EmptyState searchTerm={searchTerm} onCreateTable={onCreateTable} />
      )}
    </div>
  );
};

const TableCard = ({ table, onEdit, onDelete, onView, isDeleting }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
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
        <StatusBadge isActive={table.isActive} />
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
          onClick={onView}
          className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100"
        >
          <EyeIcon className="h-4 w-4 mr-1" />
          View Data
        </button>
        <button
          onClick={onEdit}
          className="inline-flex items-center px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <PencilIcon className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          className="inline-flex items-center px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
          disabled={isDeleting}
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

const StatusBadge = ({ isActive }) => {
  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
        isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
};

const EmptyState = ({ searchTerm, onCreateTable }) => {
  return (
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
            onClick={onCreateTable}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Your First Table
          </button>
        </div>
      )}
    </div>
  );
};

export default LookupTablesTab;
