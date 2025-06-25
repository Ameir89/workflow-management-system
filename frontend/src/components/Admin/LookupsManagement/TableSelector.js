// src/components/Admin/LookupsManagement/TableSelector.js
import React from "react";

const TableSelector = ({ tables, selectedTable, onTableChange }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select Lookup Table
      </label>
      <select
        value={selectedTable?.id || ""}
        onChange={(e) => {
          const table = tables.find((t) => t.id === parseInt(e.target.value));
          onTableChange(table);
        }}
        className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">Select a table...</option>
        {tables.map((table) => (
          <option key={table.id} value={table.id}>
            {table.displayName || table.name}
          </option>
        ))}
      </select>
      {selectedTable && (
        <div className="mt-2 text-sm text-gray-600">
          <p>{selectedTable.description || "No description available"}</p>
          <p className="mt-1">
            <span className="font-medium">
              {selectedTable.fields?.length || 0}
            </span>{" "}
            fields configured
          </p>
        </div>
      )}
    </div>
  );
};

export default TableSelector;
