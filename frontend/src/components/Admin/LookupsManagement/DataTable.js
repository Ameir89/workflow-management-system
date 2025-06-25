// src/components/Admin/LookupsManagement/DataTable.js
import React from "react";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ListBulletIcon,
} from "@heroicons/react/24/outline";

const DataTable = ({
  table,
  data,
  onEditRecord,
  onDeleteRecord,
  isDeleting,
}) => {
  if (!table || !table.fields) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <p className="text-gray-500">No table selected</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Table Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {table.displayName || table.name} Data
            </h3>
            <p className="text-sm text-gray-600">
              {data.length} {data.length === 1 ? "record" : "records"}
            </p>
          </div>
          {data.length > 0 && (
            <div className="text-sm text-gray-500">Showing all records</div>
          )}
        </div>
      </div>

      {/* Table Content */}
      {data.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <TableHeader fields={table.fields} />
              <TableBody
                data={data}
                fields={table.fields}
                onEditRecord={onEditRecord}
                onDeleteRecord={onDeleteRecord}
                isDeleting={isDeleting}
              />
            </table>
          </div>

          {/* Legend */}
          {table.fields.some((f) => f.isValueField || f.isDisplayField) && (
            <TableLegend />
          )}
        </>
      ) : (
        <EmptyDataState onAddRecord={() => onEditRecord({})} />
      )}
    </div>
  );
};

const TableHeader = ({ fields }) => {
  return (
    <thead className="bg-gray-50">
      <tr>
        {fields.map((field) => (
          <th
            key={field.name}
            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
          >
            <div className="flex items-center space-x-1">
              <span>{field.displayName || field.name}</span>
              {field.isValueField && (
                <span className="text-indigo-600 font-bold" title="Value field">
                  *
                </span>
              )}
              {field.isDisplayField && (
                <span
                  className="text-green-600 font-bold"
                  title="Display field"
                >
                  •
                </span>
              )}
              {field.isRequired && (
                <span className="text-red-500 font-bold" title="Required field">
                  !
                </span>
              )}
            </div>
          </th>
        ))}
        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
          Actions
        </th>
      </tr>
    </thead>
  );
};

const TableBody = ({
  data,
  fields,
  onEditRecord,
  onDeleteRecord,
  isDeleting,
}) => {
  return (
    <tbody className="bg-white divide-y divide-gray-200">
      {data.map((row, index) => (
        <DataRow
          key={row.id || index}
          row={row}
          fields={fields}
          onEdit={() => onEditRecord(row)}
          onDelete={() => onDeleteRecord(row)}
          isDeleting={isDeleting}
        />
      ))}
    </tbody>
  );
};

const DataRow = ({ row, fields, onEdit, onDelete, isDeleting }) => {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      {fields.map((field) => (
        <td
          key={field.name}
          className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
        >
          <CellValue value={row[field.name]} field={field} />
        </td>
      ))}
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center justify-end space-x-2">
          <button
            onClick={onEdit}
            className="text-indigo-600 hover:text-indigo-900 p-1 hover:bg-indigo-50 rounded transition-colors"
            title="Edit record"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded transition-colors"
            disabled={isDeleting}
            title="Delete record"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};

const CellValue = ({ value, field }) => {
  // Handle null/undefined values
  if (value === null || value === undefined || value === "") {
    return <span className="text-gray-400 italic">—</span>;
  }

  switch (field.type) {
    case "boolean":
      return (
        <span
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            value ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {value ? "True" : "False"}
        </span>
      );

    case "date":
      try {
        return value ? new Date(value).toLocaleDateString() : "—";
      } catch (error) {
        return <span className="text-red-500 text-xs">Invalid Date</span>;
      }

    case "number":
      return typeof value === "number" ? value.toLocaleString() : value;

    case "text":
    default:
      const stringValue = String(value);
      // Truncate long text values
      if (stringValue.length > 50) {
        return (
          <span title={stringValue}>{stringValue.substring(0, 50)}...</span>
        );
      }
      return stringValue;
  }
};

const TableLegend = () => {
  return (
    <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
      <div className="text-xs text-gray-500 space-y-1">
        <div className="flex items-center space-x-4">
          <span className="flex items-center">
            <span className="text-indigo-600 font-bold mr-1">*</span>
            Value field: Used as the actual value stored in forms
          </span>
          <span className="flex items-center">
            <span className="text-green-600 font-bold mr-1">•</span>
            Display field: Shown to users in dropdowns
          </span>
          <span className="flex items-center">
            <span className="text-red-500 font-bold mr-1">!</span>
            Required field: Must have a value
          </span>
        </div>
      </div>
    </div>
  );
};

const EmptyDataState = ({ onAddRecord }) => {
  return (
    <div className="text-center py-12 px-6">
      <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <ListBulletIcon className="h-12 w-12 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">No data found</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
        This lookup table doesn't have any records yet. Get started by adding
        your first record to populate the table.
      </p>
      <div className="space-y-3">
        <button
          onClick={onAddRecord}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add First Record
        </button>
        <div className="text-xs text-gray-400">
          You can also import data from a CSV file
        </div>
      </div>
    </div>
  );
};

export default DataTable;
