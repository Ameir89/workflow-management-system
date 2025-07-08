// Tables grid component
import React from "react";
import TableCard from "./TableCard";

const TablesGrid = ({ tables, onEdit, onDelete, onView, isDeleting }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tables.map((table) => (
        <TableCard
          key={table.id}
          table={table}
          onEdit={() => onEdit(table)}
          onDelete={() => onDelete(table)}
          onView={() => onView(table)}
          isDeleting={isDeleting}
        />
      ))}
    </div>
  );
};

export default TablesGrid;
